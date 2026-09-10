import {
    computed,
    effect,
    inject,
    Injector,
    ResourceStatus,
    runInInjectionContext,
    Signal,
    signal,
    untracked,
} from '@angular/core';
import {rxResource} from '@angular/core/rxjs-interop';
import {
    patchState,
    SignalStoreFeature,
    signalStoreFeature,
    SignalStoreFeatureResult,
    withProps,
    withState,
} from '@ngrx/signals';
import {Observable} from 'rxjs';

import {StoreCtx} from './types/store-ctx.type';
import {StoreField} from './types/store-field.type';
import {StorePrivateKey} from './types/store-private-key.type';
import {StoreSuffixedKey} from './types/store-suffix-key.type';
import {storeField} from './utils/store-field.util';
import {storeKeyResolver} from './utils/store-key-resolver.util';

const DEFAULT_NAME = 'data';
const UPDATE_FN_NAME = 'update';

type DefaultName = typeof DEFAULT_NAME;
type UpdateFnName = typeof UPDATE_FN_NAME;

type UpdateKey<TName extends string> = StoreSuffixedKey<UpdateFnName, TName, DefaultName>;

type InternalCachedResourceRef<TItem> = {
    value: Signal<TItem | undefined>;
    isLoading: Signal<boolean>;
    error: Signal<Error | undefined>;
    status: Signal<ResourceStatus>;
    reload: () => boolean;
    update: (updater: (current: TItem | undefined) => TItem | undefined) => void;
};

export type CachedResourceRef<TItem> = Omit<InternalCachedResourceRef<TItem>, 'update'>;

export type RxResourceParametrizedProps<
    TRequest,
    TItem,
    TName extends string = DefaultName,
> = StoreField<StorePrivateKey<TName>, (request: TRequest) => CachedResourceRef<TItem>> &
    StoreField<
        UpdateKey<TName>,
        (
            request: TRequest,
            updater: (current: TItem | undefined) => TItem | undefined,
        ) => void
    >;

/**
 * Конфигурация feature {@link withRxResourceParametrizedState}.
 *
 * @typeParam TRequest - Тип параметра запроса (должен быть сериализуемым в JSON).
 * @typeParam TItem - Тип возвращаемого значения.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 */
export type WithRxResourceParametrizedStateConfig<
    TRequest,
    TItem,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
> = {
    /**
     * Функция загрузки ресурса.
     *
     * Получает параметр запроса и контекст store для доступа к зависимостям.
     *
     * @param request - Параметр запроса для загрузки ресурса.
     * @param store - Контекст store. Используй для доступа к inject-properties.
     */
    loader: (request: TRequest, store: StoreCtx<Input>) => Observable<TItem>;

    /**
     * Базовое имя для генерации ключей полей.
     *
     * Определяет имена создаваемых сигналов и методов:
     * - `_<name>(request)` — функция доступа к ресурсу по ключу
     * - `_update<Name>(request, updater)` — метод локального обновления
     *
     * @default 'data'
     * @example
     * ```typescript
     * name: 'avatar'    // создаст _avatar(request), _updateAvatar(request, updater)
     * name: 'proposal'  // создаст _proposal(request), _updateProposal(request, updater)
     * ```
     */
    name?: TName;

    /**
     * Записывать снимок кэша в state для отладки в devTools.
     *
     * При `true` создаётся `effect`, который записывает текущие значения всех ресурсов в state.
     * Требует подключения `withDevtools` для просмотра в Redux DevTools.
     *
     * @default false
     */
    patchState?: boolean;
};

/**
 * Signal Store feature для создания реактивного кешируемого состояния параметризованных ресурсов.
 *
 * Особенности:
 * - **Кеширование по ключу**: каждый уникальный `request` создаёт отдельный `rxResource`, ключ — `JSON.stringify(request)`.
 * - **Ленивая загрузка**: ресурс создаётся только при первом вызове `_<name>(request)`.
 * - **Независимая реактивность**: каждый ресурс обновляется независимо при вызове `reload()` или `update()`.
 * - **Patch State**: опционально записывает снимок кэша в state для devTools.
 *
 * @example
 * ```typescript
 * type AvatarRequest = number; // masterId
 *
 * export const AvatarStore = signalStore(
 *     {providedIn: 'root'},
 *     withRxResourceParametrizedState<AvatarRequest, string>({
 *         loader: (masterId, store) =>
 *             inject(PhotoHubApiService)
 *                 .getEmployeePhotoUrl(masterId)
 *                 .pipe(catchError(() => of(null))),
 *     }),
 *     withProps(({_data}) => ({
 *         avatar: _data, // Пробрасываем наружу
 *     })),
 * );
 *
 * // В компоненте
 * const store = inject(AvatarStore);
 * const masterId = input.required<number>();
 *
 * const avatar = computed(() => store.avatar(masterId()));
 *
 * avatar().value();        // URL аватара
 * avatar().isLoading();    // Статус загрузки
 * avatar().reload();       // Перезагрузить
 * // store._update(masterId(), (v) => v); // Локальное обновление (внутри store)
 * ```
 *
 * @example
 * ```typescript
 * // С кастомным именем
 * export const ProposalStore = signalStore(
 *     withProps(() => ({_proposalApiService: inject(ProposalApiService)})),
 *     withRxResourceParametrizedState<number, Proposal, _, 'proposal'>({
 *         loader: (id, store) => store._proposalApiService.getProposal(id),
 *         name: 'proposal',
 *     }),
 *     withProps(({_proposal}) => ({
 *         proposal: _proposal, // Публичный API
 *     })),
 * );
 *
 * // store.proposal(123).value();
 * // store._updateProposal(123, (current) => current); // внутри store
 * ```
 *
 * @typeParam TRequest - Тип параметра запроса (должен быть сериализуемым в JSON).
 * @typeParam TItem - Тип возвращаемого значения.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 *
 * @see {@link https://hr-proposals.pages.devplatform.tcsbank.ru/hr-growth-frontend-core/docs/signal-store-features/with-rx-resource-parametrized-state.feature Полная документация и рецепты}
 */
export function withRxResourceParametrizedState<
    TRequest,
    TItem,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    cfg: WithRxResourceParametrizedStateConfig<TRequest, TItem, Input, TName>,
): SignalStoreFeature<
    Input,
    {
        props: RxResourceParametrizedProps<TRequest, TItem, TName>;
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        state: {};
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        methods: {};
    }
> {
    const keys = storeKeyResolver(cfg.name ?? DEFAULT_NAME, DEFAULT_NAME);

    const privateName = keys.privateKey;
    const updateKey = keys.privateSuffixed(UPDATE_FN_NAME);

    return signalStoreFeature(
        withState({
            [privateName]: undefined,
        } as Record<
            StorePrivateKey<TName>,
            Record<string, TItem | undefined> | undefined
        >),
        withProps((store) => {
            const injector = inject(Injector);
            const cache = signal(new Map<string, InternalCachedResourceRef<TItem>>(), {
                equal: () => false,
            });

            function createResource(request: TRequest): InternalCachedResourceRef<TItem> {
                const resource = runInInjectionContext(injector, () =>
                    untracked(() =>
                        rxResource({
                            stream: () =>
                                runInInjectionContext(injector, () =>
                                    cfg.loader(request, store as StoreCtx<Input>),
                                ),
                        }),
                    ),
                );

                return {
                    value: resource.value.asReadonly(),
                    isLoading: resource.isLoading,
                    error: computed(() => resource.error()),
                    status: computed(() => resource.status()),
                    reload: () => resource.reload(),
                    update: (
                        updater: (current: TItem | undefined) => TItem | undefined,
                    ) =>
                        resource.update((current) =>
                            updater(current as TItem | undefined),
                        ),
                };
            }

            function data(request: TRequest): CachedResourceRef<TItem> {
                const key = JSON.stringify(request);
                const cacheMap = untracked(() => cache());
                let resource = cacheMap.get(key);

                if (!resource) {
                    resource = createResource(request);
                    cacheMap.set(key, resource);
                }

                return resource;
            }

            if (cfg.patchState) {
                effect(() => {
                    const map = cache();
                    const snapshot: Record<string, TItem | undefined> = {};

                    map.forEach((resource, key) => {
                        snapshot[key] = resource.value();
                    });
                    const snapshotName = `${privateName}Snapshot`;

                    patchState(store, {
                        [snapshotName]: snapshot,
                    } as Partial<
                        StoreField<
                            StorePrivateKey<TName>,
                            Record<string, TItem | undefined>
                        >
                    >);
                });
            }

            return {
                ...storeField(privateName, data),
                ...storeField(
                    updateKey,
                    (
                        request: TRequest,
                        updater: (current: TItem | undefined) => TItem | undefined,
                    ) =>
                        untracked(() => cache())
                            .get(JSON.stringify(request))
                            ?.update(updater),
                ),
            };
        }),
    ) as any;
}
