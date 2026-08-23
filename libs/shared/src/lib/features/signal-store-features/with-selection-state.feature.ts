import {computed, linkedSignal, type Signal} from '@angular/core';
import {
    type SignalStoreFeature,
    signalStoreFeature,
    type SignalStoreFeatureResult,
    withProps,
} from '@ngrx/signals';

import {StoreField} from './types/store-field.type';
import {StorePrivateKey} from './types/store-private-key.type';
import {storeField} from './utils/store-field.util';
import {storeKeyResolver} from './utils/store-key-resolver.util';

const DEFAULT_NAME = 'selection';

type DefaultName = typeof DEFAULT_NAME;

export type SelectionChange<T> = {
    added: T[];
    removed: T[];
};

export type SelectionStateApi<T> = {
    selected: Signal<T[]>;
    changed: Signal<SelectionChange<T> | undefined>;
    selectedCount: Signal<number>;
    hasValue: Signal<boolean>;
    isEmpty: Signal<boolean>;
    multiple: boolean;
    select: (...values: T[]) => boolean;
    deselect: (...values: T[]) => boolean;
    setSelection: (...values: T[]) => boolean;
    toggle: (value: T) => boolean;
    clear: () => boolean;
    isSelected: (value: T) => boolean;
    sort: (predicate?: (a: T, b: T) => number) => void;
    isMultipleSelection: () => boolean;
};

export type SelectionStateProps<T, TName extends string = DefaultName> = StoreField<
    StorePrivateKey<TName>,
    SelectionStateApi<T>
>;

/**
 * Конфигурация feature {@link withSelectionState}.
 *
 * @typeParam T - Тип элемента selection.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени namespace-объекта.
 */
export type WithSelectionStateConfig<
    T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
> = {
    /**
     * Базовое имя namespace-объекта.
     *
     * Feature создаёт одно приватное поле `_<name>`, внутри которого доступны:
     * - `selected` — текущий selection
     * - `changed` — информация о последнем изменении selection
     * - `selectedCount` — количество выбранных элементов
     * - `hasValue` — есть ли выбранные элементы
     * - `isEmpty` — пуст ли selection
     * - `multiple` — включён ли multiple mode
     * - `select` — добавить значения
     * - `deselect` — удалить значения
     * - `setSelection` — полностью заменить selection
     * - `toggle` — переключить наличие значения
     * - `clear` — очистить selection
     * - `isSelected` — проверить наличие значения
     * - `sort` — отсортировать selection
     * - `isMultipleSelection` — проверить режим multiple
     *
     * @default 'selection'
     *
     * @example
     * ```typescript
     * name: 'userState'
     * // создаст:
     * // _userState.selected
     * // _userState.changed
     * // _userState.selectedCount
     * // _userState.hasValue
     * // _userState.isEmpty
     * // _userState.multiple
     * // _userState.select()
     * // _userState.deselect()
     * // _userState.setSelection()
     * // _userState.toggle()
     * // _userState.clear()
     * // _userState.isSelected()
     * // _userState.sort()
     * // _userState.isMultipleSelection()
     * ```
     */
    name?: TName;

    /**
     * Разрешён множественный выбор.
     *
     * При `false` selection всегда содержит не более одного элемента.
     * При `true` selection может содержать несколько уникальных элементов.
     *
     * @default false
     */
    multiple?: boolean;

    /**
     * Начально выбранные значения.
     *
     * Значения автоматически нормализуются:
     * - удаляются дубликаты
     * - в single mode остаётся только первый элемент
     *
     * Может использоваться для автоматического вывода типа `T`.
     *
     * @default []
     */
    initialValue?: T[];

    /**
     * Функция сравнения элементов selection.
     *
     * Используется во всех операциях:
     * - `select`
     * - `deselect`
     * - `toggle`
     * - `isSelected`
     * - нормализация `initialValue`
     * - вычисление `changed`
     *
     * @default Object.is
     *
     * @example
     * ```typescript
     * compareWith: (a, b) => a.id === b.id
     * ```
     */
    compareWith?: (a: T, b: T) => boolean;
};

function createSelectionFeature<
    T,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    opts: WithSelectionStateConfig<T, Input, TName> = {},
): SignalStoreFeature<
    Input,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {state: {}; props: SelectionStateProps<T, TName>; methods: {}}
> {
    const multiple = opts.multiple ?? false;
    const compareWith = opts.compareWith ?? ((a: T, b: T): boolean => Object.is(a, b));
    const initialValue = opts.initialValue ?? [];

    const keys = storeKeyResolver(opts.name ?? DEFAULT_NAME, DEFAULT_NAME);
    const privateName = keys.privateKey;

    return signalStoreFeature(
        withProps(() => {
            function hasItem(collection: T[], value: T): boolean {
                return collection.some((item) => compareWith(item, value));
            }

            function normalizeValues(values: T[]): T[] {
                const unique: T[] = [];

                for (const value of values) {
                    if (!hasItem(unique, value)) {
                        unique.push(value);
                    }
                }

                if (!multiple) {
                    return unique.length > 0 ? [unique[0]!] : [];
                }

                return unique;
            }

            function arraysEqual(a: T[], b: T[]): boolean {
                if (a.length !== b.length) {
                    return false;
                }

                return a.every((item, index) => compareWith(item, b[index]!));
            }

            function diff(prev: T[], next: T[]): SelectionChange<T> {
                const added = next.filter((item) => !hasItem(prev, item));
                const removed = prev.filter((item) => !hasItem(next, item));

                return {added, removed};
            }

            const selected = linkedSignal<T[]>(() => normalizeValues(initialValue));
            const changed = linkedSignal<SelectionChange<T> | undefined>(() => undefined);

            function commit(nextRaw: T[]): boolean {
                const prev = selected();
                const next = normalizeValues(nextRaw);

                if (arraysEqual(prev, next)) {
                    return false;
                }

                selected.set(next);
                changed.set(diff(prev, next));

                return true;
            }

            function select(...values: T[]): boolean {
                if (values.length === 0) {
                    return false;
                }

                if (!multiple) {
                    return commit([values[0]!]);
                }

                const current = selected();
                const next = [...current];

                for (const value of values) {
                    if (!hasItem(next, value)) {
                        next.push(value);
                    }
                }

                return commit(next);
            }

            function deselect(...values: T[]): boolean {
                if (values.length === 0) {
                    return false;
                }

                const current = selected();
                const next = current.filter(
                    (item) => !values.some((value) => compareWith(item, value)),
                );

                return commit(next);
            }

            function setSelection(...values: T[]): boolean {
                return commit(values);
            }

            function toggle(value: T): boolean {
                return hasItem(selected(), value) ? deselect(value) : select(value);
            }

            function clear(): boolean {
                return commit([]);
            }

            function isSelected(value: T): boolean {
                return hasItem(selected(), value);
            }

            function sort(predicate?: (a: T, b: T) => number): void {
                const current = selected();
                const next = [...current].sort(predicate);

                if (!arraysEqual(current, next)) {
                    selected.set(next);
                    changed.set({added: [], removed: []});
                }
            }

            function isMultipleSelection(): boolean {
                return multiple;
            }

            const api: SelectionStateApi<T> = {
                selected: selected.asReadonly(),
                changed: changed.asReadonly(),
                selectedCount: computed(() => selected().length),
                hasValue: computed(() => selected().length > 0),
                isEmpty: computed(() => selected().length === 0),
                multiple,
                select,
                deselect,
                setSelection,
                toggle,
                clear,
                isSelected,
                sort,
                isMultipleSelection,
            };

            return {
                ...storeField(privateName, api),
            };
        }),
    ) as any;
}

/**
 * Signal Store feature для создания selection-state с поддержкой single/multiple режима.
 *
 * Этот overload используется, когда тип элементов selection нужно указать явно.
 * Полезно в случаях, когда тип нельзя вывести из `initialValue` или других параметров.
 *
 * @example
 * ```typescript
 * type User = {id: string; name: string};
 *
 * const feature = withSelectionState<User>()({
 *     name: 'userState',
 *     multiple: true,
 *     compareWith: (a, b) => a.id === b.id,
 * });
 * ```
 *
 * @typeParam T - Тип элемента selection.
 *
 * @see {@link https://hr-proposals.pages.devplatform.tcsbank.ru/hr-growth-frontend-core/docs/signal-store-features/with-selection-state.feature Полная документация и рецепты}
 */
export function withSelectionState<T>(): <
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    opts?: WithSelectionStateConfig<T, Input, TName>,
) => SignalStoreFeature<
    Input,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {state: {}; props: SelectionStateProps<T, TName>; methods: {}}
>;

/**
 * Signal Store feature для создания selection-state с поддержкой single/multiple режима.
 *
 * Особенности:
 * - **Single / multiple mode**: поддерживает выбор одного или нескольких значений.
 * - **Уникальность**: автоматически предотвращает дубли в selection.
 * - **Compare strategy**: использует `compareWith` для сравнения элементов.
 * - **Changed tracking**: хранит информацию о последнем изменении (`added`, `removed`).
 * - **Computed state**: предоставляет вычисляемые свойства (`selectedCount`, `hasValue`, `isEmpty`, `multiple`).
 * - **Namespace API**: все сигналы и методы сгруппированы внутри одного объекта `_<name>`.
 * - **Именование**: поддерживает кастомное имя namespace-объекта через `name`.
 *
 * Создаёт один namespace-объект, внутри которого доступны:
 * - текущий selection
 * - информация о последнем изменении selection
 * - вычисляемые сигналы и флаги
 * - методы управления selection
 *
 * @example
 * ```typescript
 * export const NumberSelectionStore = signalStore(
 *     {providedIn: 'root'},
 *     withSelectionState({
 *         initialValue: [1][2],
 *         multiple: true,
 *     }),
 *     withProps(({_selection}) => ({
 *         selectionState: _selection,
 *     })),
 * );
 *
 * const store = inject(NumberSelectionStore);
 *
 * store.selectionState.selected();          // number[]
 * store.selectionState.changed();           // SelectionChange<number> | undefined
 * store.selectionState.selectedCount();     // number
 * store.selectionState.hasValue();          // boolean
 * store.selectionState.isEmpty();           // boolean
 * store.selectionState.multiple;            // boolean
 * store.selectionState.select(1, 2);        // boolean
 * store.selectionState.deselect(1);         // boolean
 * store.selectionState.setSelection(3, 4);  // boolean
 * store.selectionState.toggle(1);           // boolean
 * store.selectionState.clear();             // boolean
 * store.selectionState.isSelected(1);       // boolean
 * store.selectionState.sort();              // void
 * store.selectionState.isMultipleSelection();// boolean
 * ```
 *
 * @example
 * ```typescript
 * type User = {id: string; name: string};
 *
 * export const UserSelectionStore = signalStore(
 *     {providedIn: 'root'},
 *     withSelectionState<User>()({
 *         name: 'userState',
 *         multiple: true,
 *         compareWith: (a, b) => a.id === b.id,
 *     }),
 *     withProps(({_userState}) => ({
 *         userState: _userState,
 *     })),
 * );
 *
 * const store = inject(UserSelectionStore);
 *
 * store.userState.selected();      // User[]
 * store.userState.isSelected(user); // boolean
 * store.userState.changed();       // SelectionChange<User> | undefined
 * ```
 *
 * @example
 * ```typescript
 * export const SelectionStore = signalStore(
 *     withSelectionState<number>()({
 *         name: 'leftState',
 *         multiple: true,
 *         initialValue: [1],
 *     }),
 *     withSelectionState<string>()({
 *         name: 'rightState',
 *         multiple: true,
 *         initialValue: ['a'],
 *     }),
 * );
 * ```
 *
 * @typeParam T - Тип элемента selection.
 * @typeParam Input - Внутренний тип контекста store (выводится автоматически).
 * @typeParam TName - String literal type для кастомизации имени namespace-объекта.
 *
 * @see {@link https://hr-proposals.pages.devplatform.tcsbank.ru/hr-growth-frontend-core/docs/signal-store-features/with-selection-state.feature Полная документация и рецепты}
 */
export function withSelectionState<
    T,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    opts?: WithSelectionStateConfig<T, Input, TName>,
): SignalStoreFeature<
    Input,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {state: {}; props: SelectionStateProps<T, TName>; methods: {}}
>;

export function withSelectionState<
    T,
    Input extends SignalStoreFeatureResult,
    TName extends string = DefaultName,
>(
    opts?: WithSelectionStateConfig<T, Input, TName>,
):
    | ((opts?: WithSelectionStateConfig<T, Input, TName>) => SignalStoreFeature<
          Input,
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          {state: {}; props: SelectionStateProps<T, TName>; methods: {}}
      >)
    | SignalStoreFeature<
          Input,
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          {state: {}; props: SelectionStateProps<T, TName>; methods: {}}
      > {
    if (arguments.length === 0) {
        return <
            InputInner extends SignalStoreFeatureResult,
            TNameInner extends string = DefaultName,
        >(
            innerOpts: WithSelectionStateConfig<T, InputInner, TNameInner> = {},
        ): SignalStoreFeature<
            InputInner,
            // eslint-disable-next-line @typescript-eslint/no-empty-object-type
            {state: {}; props: SelectionStateProps<T, TNameInner>; methods: {}}
        > => createSelectionFeature<T, InputInner, TNameInner>(innerOpts);
    }

    return createSelectionFeature<T, Input, TName>(opts);
}
