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

const DEFAULT_NAME = 'group';
const GROUPS_FIELD_NAME = 'groups';
const GROUP_MAP_FIELD_NAME = 'groupMap';
const GET_PREFIX = 'get';
const HAS_PREFIX = 'has';
const GROUP_SUFFIX = 'Group';

type DefaultName = typeof DEFAULT_NAME;
type GroupsFieldName = typeof GROUPS_FIELD_NAME;
type GroupMapFieldName = typeof GROUP_MAP_FIELD_NAME;
type GetPrefix = typeof GET_PREFIX;
type HasPrefix = typeof HAS_PREFIX;
type GroupSuffix = typeof GROUP_SUFFIX;

type GroupsKey<TName extends string> = StorePrivateTrailingSuffixedKey<
    GroupsFieldName,
    TName,
    DefaultName
>;
type GroupMapKey<TName extends string> = StorePrivateTrailingSuffixedKey<
    GroupMapFieldName,
    TName,
    DefaultName
>;
type GetGroupKey<TName extends string> = StorePrivateInfixedKey<
    GetPrefix,
    GroupSuffix,
    TName,
    DefaultName
>;
type HasGroupKey<TName extends string> = StorePrivateInfixedKey<
    HasPrefix,
    GroupSuffix,
    TName,
    DefaultName
>;

/** Группа: ключ и элементы в порядке исходного массива. */
export type GroupBucket<TGroupKey, T> = {
    key: TGroupKey;
    items: readonly T[];
};

export type GroupByProps<T, TGroupKey, TName extends string = DefaultName> =
    StoreField<GroupsKey<TName>, Signal<readonly GroupBucket<TGroupKey, T>[]>> &
    StoreField<
        GroupMapKey<TName>,
        Signal<ReadonlyMap<TGroupKey, readonly T[]>>
    >;

export type GroupByMethods<
    T,
    TGroupKey,
    TName extends string = DefaultName,
> = StoreField<GetGroupKey<TName>, (key: TGroupKey) => readonly T[]> &
    StoreField<HasGroupKey<TName>, (key: TGroupKey) => boolean>;

/**
 * Конфигурация feature {@link withGroupBy}.
 *
 * @typeParam T - Тип элементов.
 * @typeParam TGroupKey - Тип ключа группы (string или number).
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 */
export type WithGroupByConfig<
    T,
    TGroupKey extends string | number,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
> = {
    /**
     * Сигнал с массивом элементов для группировки.
     *
     * Получает контекст store для доступа к зависимостям.
     *
     * @param store - Контекст store. Используй для доступа к inject-properties.
     */
    items: (store: StoreCtx<Input>) => Signal<readonly T[]>;

    /**
     * Функция извлечения ключа группы из элемента.
     *
     * Элементы с одинаковым ключом попадают в одну группу; группы идут
     * в порядке первого вхождения ключа.
     *
     * @param item - Элемент.
     */
    selectGroupKey: (item: T) => TGroupKey;

    /**
     * Базовое имя для генерации ключей полей и методов.
     *
     * Определяет имена создаваемых сигналов и методов:
     * - `_<name>Groups` — массив групп `{key, items}` в порядке первого вхождения
     * - `_<name>GroupMap` — `Map` ключ → элементы для доступа за O(1)
     * - `_get<Name>Group` — метод доступа к элементам группы
     * - `_has<Name>Group` — метод проверки наличия группы
     *
     * @default 'group'
     * @example
     * ```typescript
     * name: 'day' // создаст _dayGroups, _dayGroupMap, _getDayGroup, _hasDayGroup
     * ```
     */
    name?: TName;
};

/**
 * Signal Store feature для группировки элементов по ключу.
 *
 * Особенности:
 * - **Две структуры**: массив групп `{key, items}` (для `@for` в шаблоне)
 * и `Map` ключ → элементы для доступа за O(1).
 * - **Порядок**: группы идут в порядке первого вхождения ключа, элементы
 * внутри группы — в порядке исходного массива.
 * - **Реактивность**: группы пересчитываются при изменении исходного сигнала `items`.
 * - **Методы доступа**: генерирует `_get<Name>Group` (пустой массив для
 * отсутствующей группы) и `_has<Name>Group`.
 *
 * @example
 * ```typescript
 * type Training = {trainingId: string; date: string};
 *
 * export const FeedStore = signalStore(
 *     withRxResourceState({
 *         loader: () => inject(TrainingApiService).getTrainings(),
 *     }),
 *     withGroupBy({
 *         items: (s) => computed(() => s._data() ?? []),
 *         selectGroupKey: (t) => t.date,
 *     }),
 *     withProps(({_groups, _getGroup}) => ({
 *         dayGroups: _groups,
 *         getGroup: _getGroup,
 *     })),
 * );
 *
 * // В компоненте
 * const store = inject(FeedStore);
 *
 * store.dayGroups();          // [{key: '2026-09-10', items: [...]}, ...]
 * store.getGroup('2026-09-10'); // Training[]
 * ```
 *
 * @example
 * ```typescript
 * // С кастомным именем
 * withGroupBy({
 *     name: 'day',
 *     items: (s) => s._trainings,
 *     selectGroupKey: (t) => t.date,
 * }),
 * // store._dayGroups(); store._dayGroupMap(); store._getDayGroup(date); store._hasDayGroup(date);
 * ```
 *
 * @typeParam T - Тип элементов.
 * @typeParam TGroupKey - Тип ключа группы (string или number).
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени полей.
 */
export function withGroupBy<
    T,
    TGroupKey extends string | number,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    cfg: WithGroupByConfig<T, TGroupKey, Input, TName>,
): SignalStoreFeature<
    Input,
    {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        state: {};
        props: GroupByProps<T, TGroupKey, TName>;
        methods: GroupByMethods<T, TGroupKey, TName>;
    }
> {
    const keys = storeKeyResolver(cfg.name ?? DEFAULT_NAME, DEFAULT_NAME);

    const groupsKey = keys.privateTrailingSuffixed(GROUPS_FIELD_NAME);
    const groupMapKey = keys.privateTrailingSuffixed(GROUP_MAP_FIELD_NAME);
    const getGroupKey = keys.privateInfixed(GET_PREFIX, GROUP_SUFFIX);
    const hasGroupKey = keys.privateInfixed(HAS_PREFIX, GROUP_SUFFIX);

    return signalStoreFeature(
        withProps((store) => {
            const itemsSig = cfg.items(store as StoreCtx<Input>);
            const groupMap = computed<ReadonlyMap<TGroupKey, readonly T[]>>(() => {
                const map = new Map<TGroupKey, T[]>();

                for (const item of itemsSig()) {
                    const key = cfg.selectGroupKey(item);
                    const bucket = map.get(key);

                    if (bucket) {
                        bucket.push(item);
                    } else {
                        map.set(key, [item]);
                    }
                }

                return map;
            });
            const groups = computed<readonly GroupBucket<TGroupKey, T>[]>(() =>
                Array.from(groupMap(), ([key, items]) => ({key, items})),
            );

            return {
                ...storeField(groupsKey, groups),
                ...storeField(groupMapKey, groupMap),
            };
        }),
        withMethods((store) => {
            const groupMapSignal = (store as Record<
                string,
                Signal<ReadonlyMap<TGroupKey, readonly T[]>>
            >)[groupMapKey]!;

            return {
                ...storeField(getGroupKey, (key: TGroupKey): readonly T[] =>
                    groupMapSignal().get(key) ?? [],
                ),
                ...storeField(hasGroupKey, (key: TGroupKey): boolean =>
                    groupMapSignal().has(key),
                ),
            };
        }),
    ) as any;
}
