import {TestBed} from '@angular/core/testing';
import {signalStore, withMethods, withProps} from '@ngrx/signals';

import {SelectionChange, withSelectionState} from './with-selection-state.feature';

type User = {
    id: string;
    name: string;
};

describe('withSelectionState', () => {
    describe('базовое состояние', () => {
        it('должен создавать пустой selection по умолчанию', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()(),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.selectionState.selected()).toEqual([]);
            expect(store.selectionState.changed()).toBeUndefined();
            expect(store.selectionState.selectedCount()).toBe(0);
            expect(store.selectionState.hasValue()).toBe(false);
            expect(store.selectionState.isEmpty()).toBe(true);
            expect(store.selectionState.multiple).toBe(false);
        });

        it('должен принимать initialValue', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState({
                    initialValue: [1, 2],
                    multiple: true,
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.selectionState.selected()).toEqual([1, 2]);
            expect(store.selectionState.selectedCount()).toBe(2);
            expect(store.selectionState.hasValue()).toBe(true);
            expect(store.selectionState.isEmpty()).toBe(false);
            expect(store.selectionState.multiple).toBe(true);
        });

        it('в single mode должен нормализовать initialValue до одного элемента', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState({
                    initialValue: [1, 2, 3],
                    multiple: false,
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.selectionState.selected()).toEqual([1]);
        });

        it('должен удалять дубли из initialValue', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState({
                    initialValue: [1, 1, 2, 2, 3],
                    multiple: true,
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.selectionState.selected()).toEqual([1, 2, 3]);
        });
    });

    describe('select', () => {
        it('select(...values) должен добавлять значения в multiple mode', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({multiple: true}),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    select: (...values: number[]): boolean =>
                        _selection.select(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.select(1)).toBe(true);
            expect(store.selectionState.selected()).toEqual([1]);
            expect(store.selectionState.changed()).toEqual<SelectionChange<number>>({
                added: [1],
                removed: [],
            });

            expect(store.select(2, 3)).toBe(true);
            expect(store.selectionState.selected()).toEqual([1, 2, 3]);
            expect(store.selectionState.changed()).toEqual<SelectionChange<number>>({
                added: [2, 3],
                removed: [],
            });
        });

        it('select(...values) не должен добавлять дубликаты', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({multiple: true}),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    select: (...values: number[]): boolean =>
                        _selection.select(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.select(1, 2)).toBe(true);
            expect(store.selectionState.selected()).toEqual([1, 2]);
            expect(store.select(2, 1)).toBe(false);
            expect(store.selectionState.selected()).toEqual([1, 2]);
            expect(store.selectionState.changed()).toEqual<SelectionChange<number>>({
                added: [1, 2],
                removed: [],
            });
        });

        it('в single mode select должен хранить только одно значение', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({multiple: false}),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    select: (...values: number[]): boolean =>
                        _selection.select(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.select(1)).toBe(true);
            expect(store.selectionState.selected()).toEqual([1]);
            expect(store.selectionState.changed()).toEqual({
                added: [1],
                removed: [],
            });

            expect(store.select(2, 3)).toBe(true);
            expect(store.selectionState.selected()).toEqual([2]);
            expect(store.selectionState.changed()).toEqual({
                added: [2],
                removed: [1],
            });
        });

        it('select() без аргументов должен возвращать false', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()(),
                withMethods(({_selection}) => ({
                    select: (...values: number[]): boolean =>
                        _selection.select(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.select()).toBe(false);
        });
    });

    describe('deselect', () => {
        it('deselect(...values) должен удалять выбранные значения', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [1, 2, 3],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    deselect: (...values: number[]): boolean =>
                        _selection.deselect(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.deselect(2)).toBe(true);
            expect(store.selectionState.selected()).toEqual([1, 3]);
            expect(store.selectionState.changed()).toEqual({
                added: [],
                removed: [2],
            });
        });

        it('deselect несуществующих значений не должен менять selection', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [1, 2],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    deselect: (...values: number[]): boolean =>
                        _selection.deselect(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.deselect(3)).toBe(false);
            expect(store.selectionState.selected()).toEqual([1, 2]);
            expect(store.selectionState.changed()).toBeUndefined();
        });

        it('deselect() без аргументов должен возвращать false', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    initialValue: [1],
                    multiple: true,
                }),
                withMethods(({_selection}) => ({
                    deselect: (...values: number[]): boolean =>
                        _selection.deselect(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.deselect()).toBe(false);
        });
    });

    describe('setSelection', () => {
        it('setSelection(...values) должен полностью заменять selection', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [1, 2],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    setSelection: (...values: number[]): boolean =>
                        _selection.setSelection(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.setSelection(3, 4)).toBe(true);
            expect(store.selectionState.selected()).toEqual([3, 4]);
            expect(store.selectionState.changed()).toEqual({
                added: [3, 4],
                removed: [1, 2],
            });
        });

        it('setSelection в single mode должен оставлять одно значение', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: false,
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    setSelection: (...values: number[]): boolean =>
                        _selection.setSelection(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.setSelection(5, 6, 7)).toBe(true);
            expect(store.selectionState.selected()).toEqual([5]);
            expect(store.selectionState.changed()).toEqual({
                added: [5],
                removed: [],
            });
        });

        it('setSelection с тем же значением не должен менять selection', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    initialValue: [1, 2],
                    multiple: true,
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    setSelection: (...values: number[]): boolean =>
                        _selection.setSelection(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.setSelection(1, 2)).toBe(false);
            expect(store.selectionState.selected()).toEqual([1, 2]);
            expect(store.selectionState.changed()).toBeUndefined();
        });
    });

    describe('toggle', () => {
        it('toggle(value) должен добавлять отсутствующее значение', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    toggle: (value: number): boolean => _selection.toggle(value),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.toggle(1)).toBe(true);
            expect(store.selectionState.selected()).toEqual([1]);
            expect(store.selectionState.changed()).toEqual({
                added: [1],
                removed: [],
            });
        });

        it('toggle(value) должен удалять выбранное значение', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [1],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    toggle: (value: number): boolean => _selection.toggle(value),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.toggle(1)).toBe(true);
            expect(store.selectionState.selected()).toEqual([]);
            expect(store.selectionState.changed()).toEqual({
                added: [],
                removed: [1],
            });
        });
    });

    describe('clear', () => {
        it('clear() должен очищать selection', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [1, 2],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    clear: (): boolean => _selection.clear(),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.clear()).toBe(true);
            expect(store.selectionState.selected()).toEqual([]);
            expect(store.selectionState.changed()).toEqual({
                added: [],
                removed: [1, 2],
            });
        });

        it('clear() на пустом selection должен возвращать false', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()(),
                withMethods(({_selection}) => ({
                    clear: (): boolean => _selection.clear(),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.clear()).toBe(false);
        });
    });

    describe('query methods', () => {
        it('isSelected() должен определять выбранность значения', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [1, 2],
                }),
                withMethods(({_selection}) => ({
                    isSelected: (value: number): boolean => _selection.isSelected(value),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.isSelected(1)).toBe(true);
            expect(store.isSelected(3)).toBe(false);
        });

        it('isEmpty() и hasValue() должны корректно работать', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()(),
                withMethods(({_selection}) => ({
                    isEmpty: (): boolean => _selection.isEmpty(),
                    hasValue: (): boolean => _selection.hasValue(),
                    select: (...values: number[]): boolean =>
                        _selection.select(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.isEmpty()).toBe(true);
            expect(store.hasValue()).toBe(false);

            store.select(1);

            expect(store.isEmpty()).toBe(false);
            expect(store.hasValue()).toBe(true);
        });

        it('isMultipleSelection() должен возвращать текущий режим', () => {
            const SingleStore = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({multiple: false}),
                withMethods(({_selection}) => ({
                    isMultipleSelection: (): boolean => _selection.isMultipleSelection(),
                })),
            );

            const MultipleStore = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({multiple: true}),
                withMethods(({_selection}) => ({
                    isMultipleSelection: (): boolean => _selection.isMultipleSelection(),
                })),
            );

            const singleStore = TestBed.inject(SingleStore);
            const multipleStore = TestBed.inject(MultipleStore);

            expect(singleStore.isMultipleSelection()).toBe(false);
            expect(multipleStore.isMultipleSelection()).toBe(true);
        });
    });

    describe('sort', () => {
        it('sort() должен сортировать выбранные значения', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [3, 1, 2],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    sort: (predicate?: (a: number, b: number) => number): void =>
                        _selection.sort(predicate),
                })),
            );

            const store = TestBed.inject(Store);

            store.sort((a, b) => a - b);

            expect(store.selectionState.selected()).toEqual([1, 2, 3]);
            expect(store.selectionState.changed()).toEqual({
                added: [],
                removed: [],
            });
        });

        it('sort() без predicate должен использовать стандартную сортировку массива', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [3, 1, 2],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    sort: (predicate?: (a: number, b: number) => number): void =>
                        _selection.sort(predicate),
                })),
            );

            const store = TestBed.inject(Store);

            store.sort();

            expect(store.selectionState.selected()).toEqual([1, 2, 3]);
        });

        it('sort() не должен менять changed, если порядок не изменился', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    multiple: true,
                    initialValue: [1, 2, 3],
                }),
                withProps(({_selection}) => ({
                    selectionState: _selection,
                })),
                withMethods(({_selection}) => ({
                    sort: (predicate?: (a: number, b: number) => number): void =>
                        _selection.sort(predicate),
                })),
            );

            const store = TestBed.inject(Store);

            store.sort((a, b) => a - b);

            expect(store.selectionState.changed()).toBeUndefined();
        });
    });

    describe('compareWith', () => {
        it('должен использовать compareWith для isSelected/select/deselect', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<User>()({
                    multiple: true,
                    compareWith: (a, b) => a.id === b.id,
                    name: 'user',
                }),
                withProps(({_user}) => ({
                    userState: _user,
                })),
                withMethods(({_user}) => ({
                    select: (...values: User[]): boolean => _user.select(...values),
                    deselect: (...values: User[]): boolean => _user.deselect(...values),
                    isSelected: (value: User): boolean => _user.isSelected(value),
                })),
            );

            const store = TestBed.inject(Store);

            store.select({id: '1', name: 'Alex'});

            expect(store.isSelected({id: '1', name: 'Other name'})).toBe(true);
            expect(store.select({id: '1', name: 'Changed'})).toBe(false);
            expect(store.userState.selected()).toEqual([{id: '1', name: 'Alex'}]);

            expect(store.deselect({id: '1', name: 'Any'})).toBe(true);
            expect(store.userState.selected()).toEqual([]);
            expect(store.userState.changed()).toEqual({
                added: [],
                removed: [{id: '1', name: 'Alex'}],
            });
        });
    });

    describe('множественные selection feature', () => {
        it('должен поддерживать несколько withSelectionState в одном store', () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withSelectionState<number>()({
                    name: 'left',
                    multiple: true,
                    initialValue: [1],
                }),
                withSelectionState<string>()({
                    name: 'right',
                    multiple: true,
                    initialValue: ['a'],
                }),
                withProps(({_left, _right}) => ({
                    leftState: _left,
                    rightState: _right,
                })),
                withMethods(({_left, _right}) => ({
                    selectLeft: (...values: number[]): boolean => _left.select(...values),
                    selectRight: (...values: string[]): boolean =>
                        _right.select(...values),
                })),
            );

            const store = TestBed.inject(Store);

            expect(store.leftState.selected()).toEqual([1]);
            expect(store.rightState.selected()).toEqual(['a']);

            expect(store.selectLeft(2)).toBe(true);
            expect(store.leftState.selected()).toEqual([1, 2]);
            expect(store.rightState.selected()).toEqual(['a']);
            expect(store.leftState.changed()).toEqual({
                added: [2],
                removed: [],
            });
            expect(store.rightState.changed()).toBeUndefined();

            expect(store.selectRight('b')).toBe(true);
            expect(store.leftState.selected()).toEqual([1, 2]);
            expect(store.rightState.selected()).toEqual(['a', 'b']);
            expect(store.rightState.changed()).toEqual({
                added: ['b'],
                removed: [],
            });

            expect(store.leftState.selectedCount()).toBe(2);
            expect(store.rightState.selectedCount()).toBe(2);
        });
    });
});
