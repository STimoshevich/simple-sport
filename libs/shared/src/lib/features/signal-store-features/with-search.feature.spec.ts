import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {signalStore, withProps} from '@ngrx/signals';

import {withSearch} from './with-search.feature';

type Exercise = {id: string; name: string; usageCount: number};

const EXERCISES: readonly Exercise[] = [
    {id: 'e1', name: 'Приседания со штангой', usageCount: 5},
    {id: 'e2', name: 'Жим лёжа', usageCount: 20},
    {id: 'e3', name: 'Подтягивания', usageCount: 1},
];

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createSearchStore(initial: readonly Exercise[] = EXERCISES) {
    const itemsSignal = signal<readonly Exercise[]>(initial);

    const Store = signalStore(
        {providedIn: 'root'},
        withProps(() => ({_itemsSource: itemsSignal.asReadonly()})),
        withSearch({
            items: (s) => s._itemsSource,
            weight: (e) => e.usageCount,
        }),
        withProps(({_search}) => ({
            searchApi: _search,
        })),
    );

    return {store: TestBed.inject(Store), itemsSignal};
}

describe('withSearch', () => {
    it('пустой запрос возвращает исходный список без фильтрации', () => {
        const {store} = createSearchStore();

        expect(store.searchApi.results()).toEqual(EXERCISES);
        expect(store.searchApi.hasQuery()).toBe(false);
        expect(store.searchApi.best()).toBeUndefined();
    });

    it('фильтрует и ранжирует по запросу', () => {
        const {store} = createSearchStore();

        store.searchApi.setQuery('жим');

        expect(store.searchApi.hasQuery()).toBe(true);
        expect(store.searchApi.results().map((e) => e.id)).toEqual(['e2']);
        expect(store.searchApi.best()?.id).toBe('e2');
    });

    it('неверная раскладка находит кириллическое название', () => {
        const {store} = createSearchStore();

        // «Подтягивания», набранное в английской раскладке (ЙЦУКЕН)
        store.searchApi.setQuery('gjlnzubdfybz');

        expect(store.searchApi.best()?.id).toBe('e3');
    });

    it('reset возвращает полный список', () => {
        const {store} = createSearchStore();

        store.searchApi.setQuery('жим');
        store.searchApi.reset();

        expect(store.searchApi.query()).toBe('');
        expect(store.searchApi.results()).toEqual(EXERCISES);
    });

    it('результаты пересчитываются при изменении источника', () => {
        const {store, itemsSignal} = createSearchStore();

        store.searchApi.setQuery('жим');
        itemsSignal.set([{id: 'e4', name: 'Жим стоя', usageCount: 0}]);

        expect(store.searchApi.results().map((e) => e.id)).toEqual(['e4']);
    });

    it('кастомное имя создаёт namespace-поле _exercise', () => {
        const itemsSignal = signal<readonly Exercise[]>(EXERCISES);

        const Store = signalStore(
            {providedIn: 'root'},
            withProps(() => ({_itemsSource: itemsSignal.asReadonly()})),
            withSearch({
                name: 'exercise',
                items: (s) => s._itemsSource,
            }),
            withProps(({_exercise}) => ({
                exerciseSearch: _exercise,
            })),
        );

        const store = TestBed.inject(Store);

        store.exerciseSearch.setQuery('подтягивания');
        expect(store.exerciseSearch.best()?.id).toBe('e3');
    });
});
