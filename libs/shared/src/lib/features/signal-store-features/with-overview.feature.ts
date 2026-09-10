import {
    computed,
    inject,
    Injector,
    linkedSignal,
    ResourceStatus,
    runInInjectionContext,
    type Signal,
    untracked,
} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {
    patchState,
    type SignalStoreFeature,
    signalStoreFeature,
    type SignalStoreFeatureResult,
    withMethods,
    withProps,
    withState,
} from '@ngrx/signals';
import {Observable, of, switchMap, tap} from 'rxjs';

import {OverviewPagedResult} from '../types';
import {StoreCtx} from './types/store-ctx.type';

function calculatePagesCount(totalCount: number, itemsPerPage: number): number {
    if (totalCount <= 0 || itemsPerPage <= 0) {
        return 0;
    }

    const raw = totalCount / itemsPerPage;

    return totalCount % itemsPerPage === 0 ? Math.floor(raw) : Math.floor(raw) + 1;
}

function calculateOffset(forPage: number, itemsPerPage: number): number {
    const page = Math.max(0, forPage - 1);

    return page * itemsPerPage;
}

export type OverviewSorting<TSortBy extends string> = {
    sortBy: TSortBy;
    direction: 'ASC' | 'DESC';
};

export type OverviewRequest<TFilters, TSortBy extends string> = {
    offset: number;
    page: number;
    itemsPerPage: number;
    filters: TFilters | null;
    sorting: OverviewSorting<TSortBy>[];
};

export type OverviewMeta = {
    isLoading: boolean;
    error: Error | undefined;
    status: ResourceStatus;
};

export type OverviewState<TFilters, TSortBy extends string> = {
    page: number;
    filters: TFilters | null;
    sorting: OverviewSorting<TSortBy>[];
};

export type OverviewProps<TItem> = {
    items: Signal<TItem[]>;
    totalCount: Signal<number>;
    pagesCount: Signal<number>;
    meta: Signal<OverviewMeta>;
};

export type OverviewMethods<TFilters, TSortBy extends string> = {
    setPage: (page: number) => void;
    nextPage: () => void;
    setFilters: (filters: TFilters | null, opts?: {resetPage?: boolean}) => void;
    setSorting: (sorting: OverviewSorting<TSortBy>[]) => void;
    reload: () => void;
};

/**
 * Конфигурация feature {@link withOverview}.
 *
 * @typeParam TItem - Тип элементов списка.
 * @typeParam TFilters - Тип объекта фильтров.
 * @typeParam TSortBy - String literal type полей сортировки.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 */
export type WithOverviewConfig<
    TItem,
    TFilters,
    TSortBy extends string,
    Input extends SignalStoreFeatureResult,
> = {
    /**
     * Функция загрузки данных.
     *
     * Получает текущие параметры запроса и контекст store (для доступа к зависимостям).
     *
     * @param request - Текущие параметры: page, offset, itemsPerPage, filters, sorting.
     * @param store - Контекст store. Используй для доступа к inject-properties.
     */
    loader: (
        request: OverviewRequest<TFilters, TSortBy>,
        store: StoreCtx<Input>,
    ) => Observable<OverviewPagedResult<TItem>>;

    /**
     * Количество элементов на странице.
     *
     * @default 10_000
     */
    itemsPerPage?: number;
};

/**
 * Signal Store feature для постраничной загрузки данных с фильтрацией и сортировкой.
 *
 * Особенности:
 * - **Lazy-загрузка**: запрос не уходит до явного вызова `setPage` / `setFilters` / `setSorting` / `reload`.
 * - **Авто-коррекция страницы**: если запрос вернул пустой результат при `totalCount > 0` (например, после удаления последнего элемента), feature автоматически переключается на последнюю валидную страницу.
 *
 * @example
 * ```typescript
 * type UserFilters = {search?: string};
 * type UserSortBy = 'name' | 'createdAt';
 *
 * export const UsersStore = signalStore(
 *     {providedIn: 'root'},
 *     withProps(() => ({_api: inject(UserApiService)})),
 *     withOverview<UserFilters, UserSortBy>()<User, _>({
 *         itemsPerPage: 20,
 *         loader: (req, store) => store._api.getUsers(req),
 *     }),
 * );
 *
 * // В компоненте
 * const store = inject(UsersStore);
 * store.setPage(1);                          // первая загрузка
 * store.setFilters({search: 'John'});        // сбросит page в 1
 * store.setSorting([{sortBy: 'name', direction: 'ASC'}]);
 * store.reload();                            // перезагрузить текущую
 * ```
 *
 * @typeParam TFilters - Тип объекта фильтров.
 * @typeParam TSortBy - String literal type полей, по которым можно сортировать.
 *
 * @see {@link https://hr-proposals.pages.devplatform.tcsbank.ru/hr-growth-frontend-core/docs/signal-store-features/with-overview.feature Полная документация и рецепты}
 */
export function withOverview<TFilters, TSortBy extends string>() {
    return function withOverviewInner<TItem, Input extends SignalStoreFeatureResult>(
        cfg: WithOverviewConfig<TItem, TFilters, TSortBy, Input>,
    ): SignalStoreFeature<
        Input,
        {
            state: OverviewState<TFilters, TSortBy> & {
                _fetch: OverviewRequest<TFilters, TSortBy> | null;
            };
            props: OverviewProps<TItem>;
            methods: OverviewMethods<TFilters, TSortBy>;
        }
    > {
        const itemsPerPage = cfg.itemsPerPage ?? 10_000;

        return signalStoreFeature(
            withState<
                OverviewState<TFilters, TSortBy> & {
                    _fetch: OverviewRequest<TFilters, TSortBy> | null;
                }
            >({
                page: 1,
                filters: null,
                sorting: [],
                _fetch: null,
            }),

            withProps((store) => {
                const injector = inject(Injector);
                const ctx = store as unknown as {
                    _fetch: Signal<OverviewRequest<TFilters, TSortBy> | null>;
                };

                const resource = rxResource({
                    //undefined нужен для того, что бы обеспечить lazy поведение
                    //то есть если никто явно не вызовет снаружи какой-либо тригер вроде setFilters
                    //то запрос сам не уйдет
                    params: () => (ctx._fetch() ? ctx._fetch() : undefined),
                    stream: ({params}) => {
                        if (!params) {
                            return of<OverviewPagedResult<TItem>>({
                                items: [],
                                totalCount: 0,
                            });
                        }

                        return runInInjectionContext(injector, () =>
                            buildFetchRequest(
                                params,
                                (req) =>
                                    cfg.loader(req, store as unknown as StoreCtx<Input>),
                                itemsPerPage,
                                store,
                            ),
                        );
                    },
                });

                // Кэш последнего успешного результата.
                // Во время перезагрузки rxResource временно теряет value (hasValue → false),
                // и без этого кэша items/totalCount/pagesCount обнулялись бы и UI мигал.
                // linkedSignal в такие моменты отдаёт previous.value — предыдущий успешный ответ.
                const lastResult = linkedSignal<
                    OverviewPagedResult<TItem> | undefined,
                    OverviewPagedResult<TItem>
                >({
                    source: () => (resource.hasValue() ? resource.value() : undefined),
                    computation: (current, previous) =>
                        current ?? previous?.value ?? {items: [], totalCount: 0},
                });

                const items = computed(() => lastResult().items);
                const totalCount = computed(() => lastResult().totalCount);
                const pagesCount = computed(() =>
                    calculatePagesCount(totalCount(), itemsPerPage),
                );

                const meta = computed<OverviewMeta>(() => ({
                    isLoading: resource.isLoading(),
                    error: resource.error() as Error | undefined,
                    status: resource.status(),
                }));

                return {
                    items,
                    totalCount,
                    pagesCount,
                    meta,
                };
            }),

            withMethods((store) => {
                const ctx = store as unknown as {
                    page: Signal<number>;
                    filters: Signal<TFilters | null>;
                    sorting: Signal<OverviewSorting<TSortBy>[]>;
                };

                const triggerFetch = (overrides: {
                    page?: number;
                    filters?: TFilters | null;
                    sorting?: OverviewSorting<TSortBy>[];
                }): void => {
                    const page = overrides.page ?? untracked(() => ctx.page());
                    const next: OverviewRequest<TFilters, TSortBy> = {
                        page,
                        offset: calculateOffset(page, itemsPerPage),
                        itemsPerPage,
                        filters:
                            overrides.filters !== undefined
                                ? overrides.filters
                                : untracked(() => ctx.filters()),
                        sorting: overrides.sorting ?? untracked(() => ctx.sorting()),
                    };

                    patchState(store, {_fetch: next} as Partial<
                        OverviewState<TFilters, TSortBy> & {
                            _fetch: OverviewRequest<TFilters, TSortBy>;
                        }
                    >);
                };

                return {
                    setPage(page: number): void {
                        patchState(store, {page} as Partial<
                            OverviewState<TFilters, TSortBy>
                        >);
                        triggerFetch({page});
                    },

                    nextPage(): void {
                        const page = untracked(() => ctx.page()) + 1;

                        patchState(store, {page} as Partial<
                            OverviewState<TFilters, TSortBy>
                        >);
                        triggerFetch({page});
                    },

                    setFilters(
                        filters: TFilters | null,
                        opts?: {resetPage?: boolean},
                    ): void {
                        const resetPage = opts?.resetPage ?? true;
                        const page = resetPage ? 1 : untracked(() => ctx.page());

                        patchState(store, {
                            filters,
                            ...(resetPage ? {page: 1} : {}),
                        } as Partial<OverviewState<TFilters, TSortBy>>);

                        triggerFetch({filters, page});
                    },

                    setSorting(sorting: OverviewSorting<TSortBy>[]): void {
                        patchState(store, {sorting, page: 1} as Partial<
                            OverviewState<TFilters, TSortBy>
                        >);
                        triggerFetch({sorting, page: 1});
                    },

                    reload(): void {
                        // Создаём новый объект _fetch с теми же параметрами —
                        // rxResource видит новую ссылку и перезапрашивает.
                        triggerFetch({});
                    },
                };
            }),
        ) as any;
    };
}

// Если пришёл пустой ответ, но общее число записей больше нуля,
// значит мы оказались на несуществующей странице —
// переключаемся на последнюю доступную страницу
// Например:
// Если после reload() приходит пустой ответ при общем числе записей > 0,
// значит мы оказались на несуществующей странице (обычно из-за удаления
// последнего элемента перед перезагрузкой) — переключаемся на последнюю корректную страницу.
function buildFetchRequest<
    TItem,
    TFilters,
    TSortBy extends string,
    Input extends SignalStoreFeatureResult,
>(
    params: OverviewRequest<TFilters, TSortBy>,
    loader: (
        req: OverviewRequest<TFilters, TSortBy>,
    ) => Observable<OverviewPagedResult<TItem>>,
    itemsPerPage: number,
    store: StoreCtx<Input>,
): Observable<OverviewPagedResult<TItem>> {
    return loader(params).pipe(
        switchMap((response) => {
            if (!response.items.length && response.totalCount) {
                const currentPagesCount = calculatePagesCount(
                    response.totalCount,
                    itemsPerPage,
                );
                const offset = calculateOffset(currentPagesCount, params.itemsPerPage);

                return loader({
                    ...params,
                    page: currentPagesCount,
                    offset,
                    itemsPerPage,
                }).pipe(
                    tap(() =>
                        patchState(store, {page: currentPagesCount} as Partial<
                            OverviewState<TFilters, TSortBy>
                        >),
                    ),
                );
            }

            return of(response);
        }),
    );
}
