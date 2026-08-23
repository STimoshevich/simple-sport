import {computed, type Signal, signal} from '@angular/core';
import {
    type SignalStoreFeature,
    signalStoreFeature,
    type SignalStoreFeatureResult,
    withProps,
} from '@ngrx/signals';

import {StoreCtx} from './types/store-ctx.type';
import {StoreField} from './types/store-field.type';
import {StorePrivateKey} from './types/store-private-key.type';
import {storeField} from './utils/store-field.util';
import {
    DEFAULT_SEARCH_MIN_SCORE,
    rankBySearchQuery,
} from './utils/search-scoring.util';

const DEFAULT_NAME = 'search';

type DefaultName = typeof DEFAULT_NAME;

/** API поиска, доступное внутри namespace-поля `_<name>`. */
export type SearchApi<T> = {
    /** Текущий поисковый запрос. */
    query: Signal<string>;
    /** Запрос не пустой — идёт фильтрация, а не полный список. */
    hasQuery: Signal<boolean>;
    /**
     * Отранжированные результаты. Пустой запрос — исходный список `items`
     * как есть (без фильтрации и сортировки).
     */
    results: Signal<readonly T[]>;
    /** Лучший результат или undefined, если ничего не прошло порог. */
    best: Signal<T | undefined>;
    /** Устанавливает запрос (уже нормализуется скорингом). */
    setQuery(query: string): void;
    /** Сбрасывает запрос — `results` снова возвращает полный список. */
    reset(): void;
};

export type SearchProps<T, TName extends string = DefaultName> = StoreField<
    StorePrivateKey<TName>,
    SearchApi<T>
>;

/**
 * Конфигурация feature {@link withSearch}.
 *
 * @typeParam T - Тип элемента (обязано иметь текстовое поле `name`).
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени namespace-поля.
 */
export type WithSearchConfig<
    T extends {name: string},
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
> = {
    /**
     * Сигнал с элементами для поиска.
     *
     * @param store - Контекст store. Используй для доступа к inject-properties.
     */
    items: (store: StoreCtx<Input>) => Signal<readonly T[]>;

    /**
     * Тексты, по которым ищем совпадение (берётся лучший скор).
     * По умолчанию — только `name`.
     *
     * @example
     * ```typescript
     * fields: (e) => [e.name, e.comment ?? '']
     * ```
     */
    fields?: (item: T) => string[];

    /**
     * Вес популярности: чаще используемое поднимается выше при равном текстовом скоре.
     * Финальный скор = текстовый × (1 + log(1 + вес)).
     *
     * @example
     * ```typescript
     * weight: (e) => e.usageCount
     * ```
     */
    weight?: (item: T) => number;

    /**
     * Минимальный текстовый скор (0…1000), ниже — элемент не попадает в результаты.
     * Точные совпадения — 1000, префикс — 800+, триграммы (опечатки) — до 280.
     *
     * @default 200
     */
    minScore?: number;

    /**
     * Базовое имя namespace-поля: `_search` по умолчанию, `_exercise` при 'exercise'.
     *
     * @default 'search'
     */
    name?: TName;
};

/**
 * Signal Store feature для нечёткого поиска по элементам списка в памяти.
 *
 * Особенности:
 * - **Многоуровневый скоринг**: точное совпадение > префикс > подстрока >
 *   токены (морфология, порядок слов) > триграммы (опечатки).
 * - **Нормализация**: регистр, `ё/е`, пунктуация; запрос в неверной раскладке
 *   ЙЦУКЕН всё равно находит кириллические названия.
 * - **Реактивность**: результаты пересчитываются при изменении запроса или `items`.
 * - **Пустой запрос**: `results` возвращает исходный список без фильтрации.
 *
 * @example
 * ```typescript
 * export const ExerciseCatalogStore = signalStore(
 *     withProps(() => ({_repo: inject(ExerciseRepository)})),
 *     withRxResourceState({
 *         name: 'exercises',
 *         loader: ({store}) => store._repo.query({withUsage: true}),
 *     }),
 *     withSearch({
 *         items: (s) => s.activeExercises,
 *         fields: (e) => [e.name, e.comment ?? ''],
 *         weight: (e) => e.usageCount,
 *     }),
 *     withProps(({_search}) => ({
 *         search: _search,
 *     })),
 * );
 *
 * // В компоненте
 * store.search.setQuery('присед');       // «Приседания со штангой» поднимется наверх
 * store.search.results();                // отранжированный список
 * store.search.hasQuery();               // true
 * store.search.reset();                  // снова полный список
 * ```
 *
 * @typeParam T - Тип элемента (обязано иметь текстовое поле `name`).
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени namespace-поля.
 */
export function withSearch<
    T extends {name: string},
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    cfg: WithSearchConfig<T, Input, TName>,
): SignalStoreFeature<
    Input,
    {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        state: {};
        props: SearchProps<T, TName>;
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        methods: {};
    }
> {
    const key = `_${cfg.name ?? DEFAULT_NAME}` as StorePrivateKey<TName>;

    return signalStoreFeature(
        withProps((store) => {
            const itemsSig = cfg.items(store as StoreCtx<Input>);
            const query = signal('');

            const hasQuery = computed(() => query().trim().length > 0);

            const ranked = computed(() =>
                rankBySearchQuery(itemsSig(), query(), {
                    texts: cfg.fields ?? ((item: T) => [item.name]),
                    weight: cfg.weight,
                    minScore: cfg.minScore ?? DEFAULT_SEARCH_MIN_SCORE,
                }),
            );

            const results = computed<readonly T[]>(() => {
                if (!hasQuery()) {
                    return itemsSig();
                }

                return ranked().map((result) => result.item);
            });

            const best = computed(() => ranked()[0]?.item);

            return {
                ...storeField(key, {
                    query: query.asReadonly(),
                    hasQuery,
                    results,
                    best,
                    setQuery(next: string): void {
                        query.set(next);
                    },
                    reset(): void {
                        query.set('');
                    },
                }),
            };
        }),
    ) as any;
}
