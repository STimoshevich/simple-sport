import {computed, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {signalStore, withMethods, withProps} from '@ngrx/signals';

import {withGroupBy} from './with-group-by.feature';

type Training = {id: string; date: string};

const TRAININGS: readonly Training[] = [
    {id: 't1', date: '2026-09-10'},
    {id: 't2', date: '2026-09-09'},
    {id: 't3', date: '2026-09-10'},
    {id: 't4', date: '2026-09-08'},
];

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createGroupByStore(initial: readonly Training[] = TRAININGS) {
    const trainingsSignal = signal<readonly Training[]>(initial);

    const Store = signalStore(
        {providedIn: 'root'},
        withProps(() => ({_trainingsSource: trainingsSignal.asReadonly()})),
        withGroupBy({
            items: (s) => s._trainingsSource,
            selectGroupKey: (t) => t.date,
        }),
        withProps(({_groups, _groupMap}) => ({
            groups: _groups,
            groupMap: _groupMap,
        })),
        withMethods(({_getGroup, _hasGroup}) => ({
            getGroup: _getGroup,
            hasGroup: _hasGroup,
        })),
    );

    return {Store, trainingsSignal};
}

describe('withGroupBy', () => {
    describe('базовые поля и методы', () => {
        it('создаёт сигналы groups, groupMap и методы getGroup, hasGroup', () => {
            const {Store} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(typeof store.groups).toBe('function');
            expect(typeof store.groupMap).toBe('function');
            expect(typeof store.getGroup).toBe('function');
            expect(typeof store.hasGroup).toBe('function');
        });
    });

    describe('группировка', () => {
        it('группирует элементы по ключу', () => {
            const {Store} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(store.groups()).toEqual([
                {key: '2026-09-10', items: [TRAININGS[0], TRAININGS[2]]},
                {key: '2026-09-09', items: [TRAININGS[1]]},
                {key: '2026-09-08', items: [TRAININGS[3]]},
            ]);
        });

        it('порядок групп — по первому вхождению ключа, элементы — исходный порядок', () => {
            const {Store} = createGroupByStore([
                {id: 't1', date: 'b'},
                {id: 't2', date: 'a'},
                {id: 't3', date: 'b'},
                {id: 't4', date: 'a'},
                {id: 't5', date: 'c'},
            ]);
            const store = TestBed.inject(Store);

            expect(store.groups().map((g) => g.key)).toEqual(['b', 'a', 'c']);
            expect(store.getGroup('b').map((t) => t.id)).toEqual(['t1', 't3']);
            expect(store.getGroup('a').map((t) => t.id)).toEqual(['t2', 't4']);
        });

        it('groupMap содержит те же группы, что и groups', () => {
            const {Store} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(store.groupMap().get('2026-09-10')).toEqual([
                TRAININGS[0],
                TRAININGS[2],
            ]);
            expect(store.groupMap().get('2026-09-08')).toEqual([TRAININGS[3]]);
        });
    });

    describe('методы доступа', () => {
        it('getGroup возвращает элементы группы', () => {
            const {Store} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(store.getGroup('2026-09-10')).toEqual([
                TRAININGS[0],
                TRAININGS[2],
            ]);
        });

        it('getGroup для отсутствующей группы возвращает пустой массив', () => {
            const {Store} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(store.getGroup('2000-01-01')).toEqual([]);
        });

        it('hasGroup возвращает true для существующей, false для отсутствующей', () => {
            const {Store} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(store.hasGroup('2026-09-10')).toBe(true);
            expect(store.hasGroup('2000-01-01')).toBe(false);
        });
    });

    describe('реактивность', () => {
        it('при изменении items группы пересчитываются', () => {
            const {Store, trainingsSignal} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(store.groups().length).toBe(3);

            trainingsSignal.set([
                {id: 't1', date: '2026-09-10'},
                {id: 't2', date: '2026-09-10'},
            ]);

            expect(store.groups()).toEqual([
                {
                    key: '2026-09-10',
                    items: [
                        {id: 't1', date: '2026-09-10'},
                        {id: 't2', date: '2026-09-10'},
                    ],
                },
            ]);
            expect(store.hasGroup('2026-09-09')).toBe(false);
        });

        it('после исчезновения ключа getGroup возвращает пустой массив', () => {
            const {Store, trainingsSignal} = createGroupByStore();
            const store = TestBed.inject(Store);

            expect(store.getGroup('2026-09-08').length).toBe(1);

            trainingsSignal.set(TRAININGS.filter((t) => t.date !== '2026-09-08'));

            expect(store.getGroup('2026-09-08')).toEqual([]);
            expect(store.hasGroup('2026-09-08')).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('пустой массив даёт пустые группы', () => {
            const {Store} = createGroupByStore([]);
            const store = TestBed.inject(Store);

            expect(store.groups()).toEqual([]);
            expect(store.groupMap().size).toBe(0);
            expect(store.hasGroup('2026-09-10')).toBe(false);
        });

        it('поддерживает числовые ключи', () => {
            type Item = {id: string; level: number};
            const items = signal<readonly Item[]>([
                {id: 'a', level: 2},
                {id: 'b', level: 1},
                {id: 'c', level: 2},
            ]);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_src: items.asReadonly()})),
                withGroupBy({
                    items: (s) => s._src,
                    selectGroupKey: (x) => x.level,
                }),
                withProps(({_groups}) => ({groups: _groups})),
                withMethods(({_getGroup}) => ({getGroup: _getGroup})),
            );
            const store = TestBed.inject(Store);

            expect(store.groups().map((g) => g.key)).toEqual([2, 1]);
            expect(store.getGroup(2).map((x) => x.id)).toEqual(['a', 'c']);
        });
    });

    describe('кастомное имя', () => {
        it('с name: "day" пробрасывает _dayGroups, _dayGroupMap, _getDayGroup, _hasDayGroup', () => {
            const trainingsSignal = signal<readonly Training[]>(TRAININGS);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_src: trainingsSignal.asReadonly()})),
                withGroupBy({
                    name: 'day',
                    items: (s) => s._src,
                    selectGroupKey: (t) => t.date,
                }),
                withProps(({_dayGroups, _dayGroupMap}) => ({
                    dayGroups: _dayGroups,
                    dayGroupMap: _dayGroupMap,
                })),
                withMethods(({_getDayGroup, _hasDayGroup}) => ({
                    getDayGroup: _getDayGroup,
                    hasDayGroup: _hasDayGroup,
                })),
            );
            const store = TestBed.inject(Store);

            expect(store.dayGroups().map((g) => g.key)).toEqual([
                '2026-09-10',
                '2026-09-09',
                '2026-09-08',
            ]);
            expect(store.dayGroupMap().get('2026-09-09')).toEqual([TRAININGS[1]]);
            expect(store.getDayGroup('2026-09-10').length).toBe(2);
            expect(store.hasDayGroup('2000-01-01')).toBe(false);
        });

        it('две группировки с разными именами не конфликтуют', () => {
            type Item = {id: string; date: string; level: number};
            const items = signal<readonly Item[]>([
                {id: 'i1', date: 'a', level: 1},
                {id: 'i2', date: 'a', level: 2},
                {id: 'i3', date: 'b', level: 1},
            ]);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_src: items.asReadonly()})),
                withGroupBy({
                    name: 'day',
                    items: (s) => s._src,
                    selectGroupKey: (x) => x.date,
                }),
                withGroupBy({
                    name: 'level',
                    items: (s) => s._src,
                    selectGroupKey: (x) => x.level,
                }),
                withProps(({_dayGroups, _levelGroups}) => ({
                    dayGroups: _dayGroups,
                    levelGroups: _levelGroups,
                })),
            );
            const store = TestBed.inject(Store);

            expect(store.dayGroups().map((g) => g.key)).toEqual(['a', 'b']);
            expect(store.levelGroups().map((g) => g.key)).toEqual([1, 2]);
        });
    });

    describe('источник данных', () => {
        it('items может быть computed от другого сигнала в store', () => {
            const all = signal<readonly Training[]>(TRAININGS);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_all: all.asReadonly()})),
                withGroupBy({
                    items: (s) =>
                        computed(() => s._all().filter((t) => t.id !== 't1')),
                    selectGroupKey: (t) => t.date,
                }),
                withProps(({_groups}) => ({groups: _groups})),
            );
            const store = TestBed.inject(Store);

            expect(store.groups().map((g) => g.key)).toEqual([
                '2026-09-09',
                '2026-09-10',
                '2026-09-08',
            ]);

            all.set([{id: 't9', date: '2026-09-01'}]);

            expect(store.groups().map((g) => g.key)).toEqual(['2026-09-01']);
        });
    });
});
