import {computed, type Signal} from '@angular/core';
import {
    type SignalStoreFeature,
    signalStoreFeature,
    type SignalStoreFeatureResult,
    withMethods,
    withProps,
} from '@ngrx/signals';

import {StoreCtx} from './types/store-ctx.type';
import {StoreField} from './types/store-field.type';
import {
    StorePrivateInfixedKey,
    StorePrivateTrailingSuffixedKey,
} from './types/store-suffix-key.type';
import {storeField} from './utils/store-field.util';
import {storeKeyResolver} from './utils/store-key-resolver.util';

const DEFAULT_NAME = 'entity';
const IDS_FIELD_NAME = 'Ids';
const BY_ID_FIELD_NAME = 'ById';
const GET_PREFIX = 'get';
const HAS_PREFIX = 'has';
const BY_ID_SUFFIX = 'ById';
const ID_SUFFIX = 'Id';

type DefaultName = typeof DEFAULT_NAME;
type IdsFieldName = typeof IDS_FIELD_NAME;
type ByIdFieldName = typeof BY_ID_FIELD_NAME;
type GetPrefix = typeof GET_PREFIX;
type HasPrefix = typeof HAS_PREFIX;
type ByIdSuffix = typeof BY_ID_SUFFIX;
type IdSuffix = typeof ID_SUFFIX;

type IdsKey<TName extends string> = StorePrivateTrailingSuffixedKey<
    IdsFieldName,
    TName,
    DefaultName
>;
type ByIdKey<TName extends string> = StorePrivateTrailingSuffixedKey<
    ByIdFieldName,
    TName,
    DefaultName
>;
type GetByIdKey<TName extends string> = StorePrivateInfixedKey<
    GetPrefix,
    ByIdSuffix,
    TName,
    DefaultName
>;
type HasIdKey<TName extends string> = StorePrivateInfixedKey<
    HasPrefix,
    IdSuffix,
    TName,
    DefaultName
>;

export type EntityIndexProps<
    T,
    Id extends string,
    TName extends string = DefaultName,
> = StoreField<IdsKey<TName>, Signal<readonly Id[]>> &
    StoreField<ByIdKey<TName>, Signal<ReadonlyMap<Id, T>>>;

export type EntityIndexMethods<
    T,
    Id extends string,
    TName extends string = DefaultName,
> = StoreField<GetByIdKey<TName>, (id: Id) => T | undefined> &
    StoreField<HasIdKey<TName>, (id: Id) => boolean>;

/**
 * Конфигурация feature {@link withEntityIndex}.
 *
 * @typeParam T - Тип сущности.
 * @typeParam Id - Тип идентификатора сущности (должен быть string-литералом или branded-типом).
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 */
export type WithEntityIndexConfig<
    T,
    Id extends string,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
> = {
    /**
     * Сигнал с массивом сущностей для построения индекса.
     *
     * Получает контекст store для доступа к зависимостям.
     *
     * @param store - Контекст store. Используй для доступа к inject-properties.
     */
    items: (store: StoreCtx<Input>) => Signal<readonly T[]>;

    /**
     * Функция извлечения уникального идентификатора сущности.
     *
     * Должна возвращать стабильный ID для каждой сущности.
     *
     * @param item - Сущность.
     */
    selectId: (item: T) => Id;

    /**
     * Базовое имя для генерации ключей полей и методов.
     *
     * Определяет имена создаваемых сигналов и методов:
     * - `_<name>Ids` — массив ID
     * - `_<name>ById` — Map для доступа за O(1)
     * - `_get<Name>ById` — метод доступа по ID
     * - `_has<Name>Id` — метод проверки наличия ID
     *
     * @default 'entity'
     * @example
     * ```typescript
     * name: 'proposal' // создаст _proposalIds, _proposalById, _getProposalById, _hasProposalId
     * name: 'user'     // создаст _userIds, _userById, _getUserById, _hasUserId
     * ```
     */
    name?: TName;
};

/**
 * Signal Store feature для построения индекса сущностей по идентификатору.
 *
 * Особенности:
 * - **Два индекса**: создаёт массив ID и `Map<Id, T>` для доступа за O(1).
 * - **Реактивность**: индексы пересчитываются при изменении исходного сигнала `items`.
 * - **Методы доступа**: генерирует методы `_get<Name>ById` и `_has<Name>Id` поверх `Map`.
 *
 * @example
 * ```typescript
 * type User = {userId: string; name: string};
 *
 * export const UsersStore = signalStore(
 *     withRxResourceState({
 *         loader: () => inject(UserApiService).getUsers(),
 *     }),
 *     withEntityIndex({
 *         items: (s) => computed(() => s._data() ?? []),
 *         selectId: (x) => x.userId,
 *     }),
 *     withProps(({_entityIds, _entityById, _getById, _hasId}) => ({
 *         entityIds: _entityIds,
 *         entityById: _entityById,
 *         getById: _getById,
 *         hasId: _hasId,
 *     })),
 * );
 *
 * // В компоненте
 * const store = inject(UsersStore);
 *
 * store.entityIds();                    // ['user-1', 'user-2', ...]
 * store.entityById();                   // Map<'user-1', User>
 * store.getById('user-1');              // User | undefined
 * store.hasId('user-1');                // boolean
 * ```
 *
 * @example
 * ```typescript
 * // С кастомным именем
 * export const ProposalsStore = signalStore(
 *     withRxResourceState({
 *         name: 'proposal',
 *         loader: () => inject(ProposalApiService).getProposals(),
 *     }),
 *     withEntityIndex({
 *         name: 'proposal',
 *         items: (s) => computed(() => s._proposal() ?? []),
 *         selectId: (x) => x.proposalId,
 *     }),
 *     withProps(({_proposalIds, _proposalById, _getProposalById, _hasProposalId}) => ({
 *         proposalIds: _proposalIds,
 *         proposalById: _proposalById,
 *         getProposalById: _getProposalById,
 *         hasProposalId: _hasProposalId,
 *     })),
 * );
 *
 * // store.proposalIds();
 * // store.proposalById();
 * // store.getProposalById(123);
 * // store.hasProposalId(123);
 * ```
 *
 * @typeParam T - Тип сущности.
 * @typeParam Id - Тип идентификатора сущности (должен быть string-литералом или branded-типом).
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 *
 * @see {@link https://hr-proposals.pages.devplatform.tcsbank.ru/hr-growth-frontend-core/docs/signal-store-features/with-entity-index.feature Полная документация и рецепты}
 */
export function withEntityIndex<
    T,
    Id extends string,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    cfg: WithEntityIndexConfig<T, Id, Input, TName>,
): SignalStoreFeature<
    Input,
    {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        state: {};
        props: EntityIndexProps<T, Id, TName>;
        methods: EntityIndexMethods<T, Id, TName>;
    }
> {
    const keys = storeKeyResolver(cfg.name ?? DEFAULT_NAME, DEFAULT_NAME);

    const idsKey = keys.privateTrailingSuffixed(IDS_FIELD_NAME);
    const byIdKey = keys.privateTrailingSuffixed(BY_ID_FIELD_NAME);
    const getByIdKey = keys.privateInfixed(GET_PREFIX, BY_ID_SUFFIX);
    const hasIdKey = keys.privateInfixed(HAS_PREFIX, ID_SUFFIX);

    return signalStoreFeature(
        withProps((store) => {
            const itemsSig = cfg.items(store as StoreCtx<Input>);
            const ids = computed(() => itemsSig().map(cfg.selectId));
            const byId = computed<ReadonlyMap<Id, T>>(() => {
                const m = new Map<Id, T>();

                for (const item of itemsSig()) {
                    m.set(cfg.selectId(item), item);
                }

                return m;
            });

            return {
                ...storeField(idsKey, ids),
                ...storeField(byIdKey, byId),
            };
        }),
        withMethods((store) => {
            const byIdSignal = (store as Record<string, Signal<ReadonlyMap<Id, T>>>)[
                byIdKey
            ]!;

            return {
                ...storeField(getByIdKey, (id: Id): T | undefined =>
                    byIdSignal().get(id),
                ),
                ...storeField(hasIdKey, (id: Id): boolean => byIdSignal().has(id)),
            };
        }),
    ) as any;
}
