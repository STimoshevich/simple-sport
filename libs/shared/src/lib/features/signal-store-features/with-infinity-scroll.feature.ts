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
import {Observable, of} from 'rxjs';

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

export type InfinityScrollSorting<TSortBy extends string> = {
    sortBy: TSortBy;
    direction: 'ASC' | 'DESC';
};

export type InfinityScrollRequest<TFilters, TSortBy extends string> = {
    offset: number;
    page: number;
    itemsPerPage: number;
    filters: TFilters | null;
    sorting: InfinityScrollSorting<TSortBy>[];
    append: boolean;
};

export type InfinityScrollMeta = {
    isLoading: boolean;
    error: Error | undefined;
    status: ResourceStatus;
};

export type InfinityScrollState<TFilters, TSortBy extends string> = {
    page: number;
    filters: TFilters | null;
    sorting: InfinityScrollSorting<TSortBy>[];
};

export type InfinityScrollProps<TItem> = {
    items: Signal<TItem[]>;
    totalCount: Signal<number>;
    pagesCount: Signal<number>;
    hasMore: Signal<boolean>;
    meta: Signal<InfinityScrollMeta>;
};

export type InfinityScrollMethods<TFilters, TSortBy extends string> = {
    setPage: (page: number) => void;
    nextPage: () => void;
    setFilters: (filters: TFilters | null) => void;
    setSorting: (sorting: InfinityScrollSorting<TSortBy>[]) => void;
    reload: () => void;
    refresh: () => void;
};

/**
 * Конфигурация feature {@link withInfinityScroll}.
 *
 * @typeParam TItem - Тип элементов списка.
 * @typeParam TFilters - Тип объекта фильтров.
 * @typeParam TSortBy - String literal type полей сортировки.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 */
export type WithInfinityScrollConfig<
    TItem,
    TFilters,
    TSortBy extends string,
    Input extends SignalStoreFeatureResult,
> = {
    /**
     * Функция загрузки одной страницы.
     *
     * Получает текущие параметры запроса и контекст store (для доступа к зависимостям).
     * Loader должен возвращать только текущую страницу; feature сама накапливает items.
     *
     * @param request - Текущие параметры: page, offset, itemsPerPage, filters, sorting.
     * @param store - Контекст store. Используй для доступа к inject-properties.
     */
    loader: (
        request: InfinityScrollRequest<TFilters, TSortBy>,
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
 * Signal Store feature для бесконечной прокрутки с фильтрацией и сортировкой.
 *
 * Особенности:
 * - **Lazy-загрузка**: запрос не уходит до явного вызова `setPage` / `setFilters` / `setSorting` / `reload`.
 * - **Накопление страниц**: `nextPage()` дописывает items, `setFilters` / `setSorting` / `reload` сбрасывают список на первую страницу.
 *
 * @example
 * ```typescript
 * export const FeedStore = signalStore(
 *     withProps(() => ({_api: inject(FeedApiService)})),
 *     withInfinityScroll()({
 *         itemsPerPage: 20,
 *         loader: (req, store) => store._api.getFeed(req),
 *     }),
 * );
 *
 * const store = inject(FeedStore);
 * store.setFilters({search: 'John'});
 * store.nextPage();
 * store.hasMore();
 * ```
 */
export function withInfinityScroll<TFilters, TSortBy extends string>() {
    return function withInfinityScrollInner<
        TItem,
        Input extends SignalStoreFeatureResult,
    >(
        cfg: WithInfinityScrollConfig<TItem, TFilters, TSortBy, Input>,
    ): SignalStoreFeature<
        Input,
        {
            state: InfinityScrollState<TFilters, TSortBy> & {
                _fetch: InfinityScrollRequest<TFilters, TSortBy> | null;
            };
            props: InfinityScrollProps<TItem>;
            methods: InfinityScrollMethods<TFilters, TSortBy>;
        }
    > {
        const itemsPerPage = cfg.itemsPerPage ?? 10_000;

        return signalStoreFeature(
            withState<
                InfinityScrollState<TFilters, TSortBy> & {
                    _fetch: InfinityScrollRequest<TFilters, TSortBy> | null;
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
                    _fetch: Signal<InfinityScrollRequest<TFilters, TSortBy> | null>;
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
                            cfg.loader(params, store as unknown as StoreCtx<Input>),
                        );
                    },
                });

                // Кэш последнего успешного результата.
                // Во время перезагрузки rxResource временно теряет value (hasValue → false),
                // и без этого кэша items/totalCount/pagesCount обнулялись бы и UI мигал.
                // linkedSignal в такие моменты отдаёт previous.value — предыдущий успешный ответ.
                // При append=true новая страница дописывается к уже загруженным items.
                const lastResult = linkedSignal<
                    {
                        result: OverviewPagedResult<TItem> | undefined;
                        append: boolean;
                    },
                    OverviewPagedResult<TItem>
                >({
                    source: () => ({
                        result: resource.hasValue() ? resource.value() : undefined,
                        append: ctx._fetch()?.append ?? false,
                    }),
                    computation: (current, previous) => {
                        if (!current.result) {
                            return previous?.value ?? {items: [], totalCount: 0};
                        }

                        // params/_fetch already changed, but rxResource still holds the previous
                        // page. Keep the accumulated list until a new result actually arrives.
                        if (previous && current.result === previous.source.result) {
                            return previous.value;
                        }

                        if (!current.append) {
                            return current.result;
                        }

                        return {
                            items: [
                                ...(previous?.value.items ?? []),
                                ...current.result.items,
                            ],
                            totalCount: current.result.totalCount,
                        };
                    },
                });

                const items = computed(() => lastResult().items);
                const totalCount = computed(() => lastResult().totalCount);
                const pagesCount = computed(() =>
                    calculatePagesCount(totalCount(), itemsPerPage),
                );
                const hasMore = computed(() => items().length < totalCount());

                const meta = computed<InfinityScrollMeta>(() => ({
                    isLoading: resource.isLoading(),
                    error: resource.error() as Error | undefined,
                    status: resource.status(),
                }));

                return {
                    items,
                    totalCount,
                    pagesCount,
                    hasMore,
                    meta,
                };
            }),

            withMethods((store) => {
                const ctx = store as unknown as {
                    page: Signal<number>;
                    filters: Signal<TFilters | null>;
                    sorting: Signal<InfinityScrollSorting<TSortBy>[]>;
                    hasMore: Signal<boolean>;
                    meta: Signal<InfinityScrollMeta>;
                };

                const triggerFetch = (overrides: {
                    page?: number;
                    filters?: TFilters | null;
                    sorting?: InfinityScrollSorting<TSortBy>[];
                    append?: boolean;
                }): void => {
                    const page = overrides.page ?? untracked(() => ctx.page());
                    const next: InfinityScrollRequest<TFilters, TSortBy> = {
                        page,
                        offset: calculateOffset(page, itemsPerPage),
                        itemsPerPage,
                        filters:
                            overrides.filters !== undefined
                                ? overrides.filters
                                : untracked(() => ctx.filters()),
                        sorting: overrides.sorting ?? untracked(() => ctx.sorting()),
                        append: overrides.append ?? false,
                    };

                    patchState(store, {_fetch: next} as Partial<
                        InfinityScrollState<TFilters, TSortBy> & {
                            _fetch: InfinityScrollRequest<TFilters, TSortBy>;
                        }
                    >);
                };

                return {
                    setPage(page: number): void {
                        patchState(store, {page} as Partial<
                            InfinityScrollState<TFilters, TSortBy>
                        >);
                        triggerFetch({page, append: false});
                    },

                    nextPage(): void {
                        if (untracked(() => ctx.meta().isLoading || !ctx.hasMore())) {
                            return;
                        }

                        const next = untracked(() => ctx.page()) + 1;

                        patchState(store, {page: next} as Partial<
                            InfinityScrollState<TFilters, TSortBy>
                        >);
                        triggerFetch({page: next, append: true});
                    },

                    setFilters(filters: TFilters | null): void {
                        patchState(store, {filters, page: 1} as Partial<
                            InfinityScrollState<TFilters, TSortBy>
                        >);
                        triggerFetch({filters, page: 1, append: false});
                    },

                    setSorting(sorting: InfinityScrollSorting<TSortBy>[]): void {
                        patchState(store, {sorting, page: 1} as Partial<
                            InfinityScrollState<TFilters, TSortBy>
                        >);
                        triggerFetch({sorting, page: 1, append: false});
                    },

                    reload(): void {
                        patchState(store, {page: 1} as Partial<
                            InfinityScrollState<TFilters, TSortBy>
                        >);
                        triggerFetch({page: 1, append: false});
                    },

                    refresh(): void {
                        const page = untracked(() => ctx.page());
                        const fetch: InfinityScrollRequest<TFilters, TSortBy> = {
                            page,
                            offset: 0,
                            itemsPerPage: page * itemsPerPage,
                            filters: untracked(() => ctx.filters()),
                            sorting: untracked(() => ctx.sorting()),
                            append: false,
                        };
                        patchState(store, {_fetch: fetch} as Partial<
                            InfinityScrollState<TFilters, TSortBy> & {
                                _fetch: InfinityScrollRequest<TFilters, TSortBy>;
                            }
                        >);
                    },
                };
            }),
        ) as any;
    };
}
