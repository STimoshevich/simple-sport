import {computed, effect, linkedSignal, type Signal} from '@angular/core';
import {
    type SignalStoreFeature,
    signalStoreFeature,
    type SignalStoreFeatureResult,
    withProps,
} from '@ngrx/signals';

import {diffArrays} from '../utils';
import {StoreCtx} from './types/store-ctx.type';
import {StoreField} from './types/store-field.type';
import {StorePrivateTrailingSuffixedKey} from './types/store-suffix-key.type';
import {storeField} from './utils/store-field.util';
import {storeKeyResolver} from './utils/store-key-resolver.util';

const DEFAULT_NAME = 'entity';
const CHANGES_FIELD_NAME = 'changes';

type DefaultName = typeof DEFAULT_NAME;
type ChangesFieldName = typeof CHANGES_FIELD_NAME;

type ChangesKey<TName extends string> = StorePrivateTrailingSuffixedKey<
    ChangesFieldName,
    TName,
    DefaultName
>;

export type DiffResult<T> = {added: T[]; removed: T[]};

export type DiffChangesProps<T, TName extends string = DefaultName> = StoreField<
    ChangesKey<TName>,
    Signal<DiffResult<T>>
>;

/**
 * Конфигурация feature {@link withDiffChanges}.
 *
 * @typeParam TItem - Тип элементов коллекции.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени поля.
 */
export type WithDiffChangesConfig<
    TItem,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
> = {
    /**
     * Сигнал с массивом элементов для отслеживания изменений.
     *
     * Получает контекст store для доступа к зависимостям.
     *
     * @param store - Контекст store. Используй для доступа к inject-properties.
     */
    source: (store: StoreCtx<Input>) => Signal<TItem[]>;

    /**
     * Функция извлечения уникального идентификатора элемента.
     *
     * Используется для сравнения предыдущего и текущего состояния коллекции.
     *
     * @param item - Элемент коллекции.
     */
    selectId: (item: TItem) => string;

    /**
     * Инициировать отслеживание изменений сразу при создании store.
     *
     * При `true` создаётся `effect`, который начинает отслеживать изменения с момента инициализации.
     * При `false` отслеживание начинается только после первой подписки на `_changes`.
     *
     * @default true
     */
    eager?: boolean;

    /**
     * Базовое имя для генерации ключей полей.
     *
     * Определяет имя создаваемого сигнала: `_<name>Changes`.
     *
     * @default 'entity'
     * @example
     * ```typescript
     * name: 'proposal' // создаст сигнал _proposalChanges
     * name: 'user'     // создаст сигнал _userChanges
     * ```
     */
    name?: TName;
};

/**
 * Signal Store feature для отслеживания добавленных и удалённых элементов в реактивной коллекции.
 *
 * Особенности:
 * - **Linked computation**: использует `linkedSignal` для вычисления дельты между состояниями.
 * - **Eager tracking**: по умолчанию создаёт `effect` для немедленного отслеживания.
 * - **Нормализация**: `null`/`undefined` трактуются как пустой массив.
 * - **Сравнение по ID**: элементы сравниваются через функцию `selectId`.
 *
 * @example
 * ```typescript
 * type Item = {id: string; name: string};
 *
 * export const SelectionStore = signalStore(
 *     withState({selected: [] as Item[]}),
 *     withDiffChanges({
 *         source: (s) => s.selected,
 *         selectId: (x) => x.id,
 *     }),
 *     withProps(({_changes}) => ({
 *         changes: _changes, // Пробрасываем наружу
 *     })),
 * );
 *
 * // В компоненте
 * const store = inject(SelectionStore);
 *
 * effect(() => {
 *     const {added, removed} = store.changes();
 *     if (added.length > 0) console.log('Добавлены:', added);
 *     if (removed.length > 0) console.log('Удалены:', removed);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // С кастомным именем
 * export const CatalogStore = signalStore(
 *     withState({proposals: [] as Proposal[]}),
 *     withDiffChanges({
 *         name: 'proposal',
 *         source: (s) => s.proposals,
 *         selectId: (x) => x.proposalId,
 *     }),
 *     withProps(({_proposalChanges}) => ({
 *         proposalChanges: _proposalChanges,
 *     })),
 * );
 *
 * // store.proposalChanges(); // {added, removed}
 * ```
 *
 * @typeParam TItem - Тип элементов коллекции.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени поля.
 *
 * @see {@link https://hr-proposals.pages.devplatform.tcsbank.ru/hr-growth-frontend-core/docs/signal-store-features/with-diff-changes.feature Полная документация и рецепты}
 */
export function withDiffChanges<
    TItem,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    cfg: WithDiffChangesConfig<TItem, Input, TName>,
): SignalStoreFeature<
    Input,
    {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        state: {};
        props: DiffChangesProps<TItem, TName>;
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        methods: {};
    }
> {
    const eager = cfg.eager ?? true;

    const keys = storeKeyResolver(cfg.name ?? DEFAULT_NAME, DEFAULT_NAME);
    const changesKey = keys.privateTrailingSuffixed(CHANGES_FIELD_NAME);

    return signalStoreFeature(
        withProps((store) => {
            const src = cfg.source(store as StoreCtx<Input>);
            // нормализуем: пусть всегда будет массив
            const normalized = computed(() => (src() ?? []) as TItem[]);
            const changes = linkedSignal<TItem[], DiffResult<TItem>>({
                source: normalized,
                computation: (current, previous) => {
                    const {added, removed} = diffArrays(
                        previous?.source ?? [],
                        current ?? [],
                        cfg.selectId,
                        cfg.selectId,
                    );

                    return {added, removed};
                },
            }).asReadonly();

            // Нужно чтобы начать отслеживание изменений сразу при запуске стора.
            // При выключении нужно внимательно проверить работу.
            if (eager) {
                effect(() => {
                    changes();
                });
            }

            return storeField(changesKey, changes);
        }),
    ) as any;
}
