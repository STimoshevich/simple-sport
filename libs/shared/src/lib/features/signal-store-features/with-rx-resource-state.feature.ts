import {
    computed,
    effect,
    inject,
    Injector,
    ResourceStatus,
    runInInjectionContext,
    type Signal,
    ValueEqualityFn,
} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {
    patchState,
    type SignalStoreFeature,
    signalStoreFeature,
    type SignalStoreFeatureResult,
    withProps,
    withState,
} from '@ngrx/signals';
import {Observable} from 'rxjs';

import {StoreCtx} from './types/store-ctx.type';
import {StoreField} from './types/store-field.type';
import {StorePrivateKey} from './types/store-private-key.type';
import {
    StorePrivateTrailingSuffixedKey,
    StoreSuffixedKey,
} from './types/store-suffix-key.type';
import {storeField} from './utils/store-field.util';
import {storeKeyResolver} from './utils/store-key-resolver.util';

const DEFAULT_NAME = 'data';
const UPDATE_FN_NAME = 'update';
const RELOAD_FN_NAME = 'reload';
const META_FN_NAME = 'meta';

type DefaultName = typeof DEFAULT_NAME;
type UpdateFnName = typeof UPDATE_FN_NAME;
type ReloadFnName = typeof RELOAD_FN_NAME;
type MetaFnName = typeof META_FN_NAME;

type UpdateKey<TName extends string> = StoreSuffixedKey<UpdateFnName, TName, DefaultName>;
type ReloadKey<TName extends string> = StoreSuffixedKey<ReloadFnName, TName, DefaultName>;
type MetaKey<TName extends string> = StorePrivateTrailingSuffixedKey<
    MetaFnName,
    TName,
    DefaultName
>;

export type RxListResourceProps<T, TName extends string = DefaultName> = StoreField<
    StorePrivateKey<TName>,
    Signal<T>
> &
    StoreField<
        MetaKey<TName>,
        {
            status: Signal<ResourceStatus>;
            error: Signal<Error | undefined>;
            isLoading: Signal<boolean>;
        }
    > &
    StoreField<ReloadKey<TName>, () => void> &
    StoreField<UpdateKey<TName>, (updater: (current: T) => T) => void>;

/**
 * Конфигурация feature {@link withRxResourceState}.
 *
 * @typeParam TRequest - Тип параметра запроса.
 * @typeParam TItem - Тип возвращаемого значения.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 */
export type WithRxResourceStateConfig<
    TRequest,
    TItem,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
> = {
    /**
     * Функция загрузки ресурса.
     *
     * Получает объект с параметром запроса (если задан `requestValue`) и контекст store.
     *
     * @param params.request - Параметр запроса (если задан `requestValue`).
     * @param params.store - Контекст store. Используй для доступа к inject-properties.
     */
    loader: (params: {request?: TRequest; store: StoreCtx<Input>}) => Observable<TItem>;

    /**
     * Функция получения параметра запроса.
     *
     * При изменении возвращаемого значения ресурс автоматически перезагружается.
     * Если не задан — ресурс загружается один раз при создании store.
     *
     * @param store - Контекст store. Используй для доступа к inject-properties.
     * @default undefined
     */
    requestValue?: (store: StoreCtx<Input>) => TRequest | undefined;

    /**
     * Инициировать загрузку ресурса сразу при создании store.
     *
     * При `true` создаётся `effect`, который начинает загрузку сразу после инициализации.
     * При `false` загрузка не начнётся до явного вызова `_reload<Name>()` или изменения `requestValue`.
     *
     * @default false
     */
    eager?: boolean;

    /**
     * Функция нормализации/трансформации значения ресурса.
     *
     * Применяется к значению ресурса перед возвратом в сигнале `_<name>`.
     *
     * @param item - Значение ресурса.
     * @default identity (возвращает значение без изменений)
     */
    normalize?: (items: TItem) => TItem;

    /**
     * Базовое имя для генерации ключей полей.
     *
     * Определяет имена создаваемых сигналов и методов:
     * - `_<name>` — данные ресурса
     * - `_<name>Meta` — метаданные (status, error, isLoading)
     * - `_reload<Name>` — метод перезагрузки
     * - `_update<Name>` — метод локального обновления
     *
     * @default 'data'
     * @example
     * ```typescript
     * name: 'proposal'  // создаст _proposal, _proposalMeta, _reloadProposal, _updateProposal
     * name: 'user'      // создаст _user, _userMeta, _reloadUser, _updateUser
     * ```
     */
    name?: TName;

    /**
     * Записывать значение ресурса в state для отладки в devTools.
     *
     * При `true` создаётся `effect`, который записывает текущее значение ресурса в state.
     * Требует подключения `withDevtools` для просмотра в Redux DevTools.
     *
     * @default false
     */
    patchState?: boolean;

    /**
     * Функция сравнения предыдущего и нового значения ресурса.
     *
     * Если возвращает `true`, значение считается не изменившимся.
     *
     * @default Object.is
     */
    equal?: ValueEqualityFn<TItem>;

    /**
     * Функция сравнения предыдущего и нового значения запроса.
     *
     * Если возвращает `true`, значение считается не изменившимся.
     */
    requestEqual?: ValueEqualityFn<TRequest | undefined>;
};

/**
 * Signal Store feature для создания кешируемого состояния на базе `rxResource`.
 *
 * Особенности:
 * - **Единый ресурс**: создаёт один `rxResource` внутри store.
 * - **Параметризация**: опционально зависит от `requestValue` — при изменении параметра ресурс перезагружается.
 * - **Eager режим**: при `eager: true` создаёт `effect` для немедленной загрузки.
 * - **Нормализация**: применяет функцию `normalize` к значению ресурса перед возвратом.
 * - **Patch State**: опционально записывает значение в state для devTools.
 *
 * @example
 * ```typescript
 * type User = {id: string; name: string};
 *
 * export const CurrentUserStore = signalStore(
 *     {providedIn: 'root'},
 *     withRxResourceState({
 *         loader: () => inject(UserApiService).getCurrentUser(),
 *     }),
 *     withProps(({_data, _meta, _reload, _update}) => ({
 *         user: _data,
 *         userMeta: _meta,
 *         reloadUser: _reload,
 *         updateUser: _update,
 *     })),
 * );
 *
 * // В компоненте
 * const store = inject(CurrentUserStore);
 *
 * store.user();           // User | undefined
 * store.userMeta().isLoading; // boolean
 * store.userMeta().error;     // Error | undefined
 * store.userMeta().status;    // 'idle' | 'loading' | 'success' | 'error'
 * store.reloadUser();         // Перезагрузить
 * store.updateUser((v) => v); // Локальное обновление
 * ```
 *
 * @example
 * ```typescript
 * // С параметром запроса
 * export const ProposalStore = signalStore(
 *     withProps(() => ({
 *         _proposalRouteUid: inject(CURRENT_PROPOSAL_ID).asReadonly(),
 *         _proposalApiService: inject(ProposalApiService),
 *     })),
 *     withRxResourceState({
 *         name: 'proposal',
 *         requestValue: (store) => store._proposalRouteUid(),
 *         loader: ({request, store}) =>
 *             store._proposalApiService.getProposalById({id: request!}),
 *     }),
 *     withProps(({_proposal, _proposalMeta, _reloadProposal}) => ({
 *         proposal: _proposal,
 *         proposalMeta: _proposalMeta,
 *         reloadProposal: _reloadProposal,
 *     })),
 * );
 *
 * // store.proposal();
 * // store.proposalMeta().isLoading;
 * // store.reloadProposal();
 * ```
 *
 * @typeParam TRequest - Тип параметра запроса.
 * @typeParam TItem - Тип возвращаемого значения.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 *
 * @see {@link https://hr-proposals.pages.devplatform.tcsbank.ru/hr-growth-frontend-core/docs/signal-store-features/with-rx-resource-state.feature Полная документация и рецепты}
 */
export function withRxResourceState<
    TRequest,
    TItem,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    opts: WithRxResourceStateConfig<TRequest, TItem, Input, TName>,
): SignalStoreFeature<
    Input,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {state: {}; props: RxListResourceProps<TItem, TName>; methods: {}}
> {
    const eager = opts?.eager ?? false;
    const normalize = opts?.normalize ?? ((x: TItem): TItem => x);

    const keys = storeKeyResolver(opts.name ?? DEFAULT_NAME, DEFAULT_NAME);

    const privateName = keys.privateKey;
    const metaKey = keys.privateTrailingSuffixed(META_FN_NAME);
    const reloadKey = keys.privateSuffixed(RELOAD_FN_NAME);
    const updateKey = keys.privateSuffixed(UPDATE_FN_NAME);
    const snapshotKey = `${privateName}Snapshot`;

    return signalStoreFeature(
        withState({
            [snapshotKey]: undefined,
        } as Record<StorePrivateKey<TName>, TItem | undefined>),
        withProps((store) => {
            const injector = inject(Injector);
            let resource;

            if (opts.requestValue) {
                const requestValue = opts.requestValue;

                const request = computed(() => requestValue(store as StoreCtx<Input>), {
                    equal: opts.requestEqual,
                });

                resource = rxResource({
                    params: () => request(),
                    stream: ({params}) =>
                        runInInjectionContext(injector, () =>
                            opts.loader({
                                request: params,
                                store: store as StoreCtx<Input>,
                            }),
                        ),
                    equal: opts.equal,
                });
            } else {
                resource = rxResource({
                    stream: () =>
                        runInInjectionContext(injector, () =>
                            opts.loader({
                                store: store as StoreCtx<Input>,
                            }),
                        ),
                    equal: opts.equal,
                });
            }

            const data = computed<TItem | undefined>(() =>
                resource.hasValue() ? normalize(resource.value()) : undefined,
            );

            if (eager) {
                effect(() => {
                    data();
                });
            }

            const shapshotNanme = `${privateName}Snapshot`;

            if (opts.patchState) {
                effect(() => {
                    patchState(store, {
                        [shapshotNanme]: data(),
                    } as Partial<StoreField<StorePrivateKey<TName>, TItem>>);
                });
            }

            return {
                ...storeField(privateName, data),
                ...storeField(metaKey, {
                    status: computed(() => resource.status()),
                    isLoading: computed(() => resource.isLoading()),
                    error: computed(() => resource.error()),
                }),
                ...storeField(reloadKey, () => {
                    resource.reload();
                }),
                ...storeField(updateKey, (updater: (current: TItem) => TItem) =>
                    resource.update(() => updater(data() as TItem)),
                ),
            };
        }),
    ) as any;
}
