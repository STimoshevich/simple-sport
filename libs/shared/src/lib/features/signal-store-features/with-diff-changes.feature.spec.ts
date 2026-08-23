import {ApplicationRef, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {signalStore, withProps} from '@ngrx/signals';

import {withDiffChanges} from './with-diff-changes.feature';

type User = {id: string; name: string};

function flushEffects(): void {
    TestBed.inject(ApplicationRef).tick();
}

/**
 * Фабрика стора с проброшенным наружу _changes.
 * Используем external WritableSignal как источник.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createUserDiffStore(initial: User[] = [], opts?: {eager?: boolean}) {
    const usersSignal = signal<User[]>(initial);

    const Store = signalStore(
        {providedIn: 'root'},
        withProps(() => ({_src: usersSignal})),
        withDiffChanges({
            source: (s) => s._src,
            selectId: (u: User) => u.id,
            eager: opts?.eager,
        }),
        withProps(({_changes}) => ({changes: _changes})),
    );

    return {Store, usersSignal};
}

describe('withDiffChanges', () => {
    describe('базовое поведение', () => {
        it('создаёт сигнал _Changes (доступен под именем changes)', () => {
            const {Store} = createUserDiffStore([{id: 'a', name: 'A'}]);
            const store = TestBed.inject(Store);

            expect(typeof store.changes).toBe('function');
        });

        it('первое значение changes() считает все элементы как added', () => {
            const {Store} = createUserDiffStore([
                {id: 'a', name: 'A'},
                {id: 'b', name: 'B'},
            ]);
            const store = TestBed.inject(Store);

            const result = store.changes();

            expect(result.added.map((u) => u.id)).toEqual(['a', 'b']);
            expect(result.removed).toEqual([]);
        });

        it('пустой source даёт пустую дельту', () => {
            const {Store} = createUserDiffStore([]);
            const store = TestBed.inject(Store);

            expect(store.changes()).toEqual({added: [], removed: []});
        });
    });

    describe('дельта изменений', () => {
        it('добавление элемента — added содержит новый', () => {
            const {Store, usersSignal} = createUserDiffStore([{id: 'a', name: 'A'}]);
            const store = TestBed.inject(Store);

            // прочитали первый дифф (added: [a])
            store.changes();

            usersSignal.set([
                {id: 'a', name: 'A'},
                {id: 'b', name: 'B'},
            ]);

            const result = store.changes();

            expect(result.added.map((u) => u.id)).toEqual(['b']);
            expect(result.removed).toEqual([]);
        });

        it('удаление элемента — removed содержит удалённый', () => {
            const {Store, usersSignal} = createUserDiffStore([
                {id: 'a', name: 'A'},
                {id: 'b', name: 'B'},
            ]);
            const store = TestBed.inject(Store);

            store.changes(); // зафиксировали previous = [a, b]

            usersSignal.set([{id: 'a', name: 'A'}]);

            const result = store.changes();

            expect(result.added).toEqual([]);
            expect(result.removed.map((u) => u.id)).toEqual(['b']);
        });

        it('замена элемента — added содержит новый, removed содержит старый', () => {
            const {Store, usersSignal} = createUserDiffStore([{id: 'a', name: 'A'}]);
            const store = TestBed.inject(Store);

            store.changes();

            usersSignal.set([{id: 'b', name: 'B'}]);

            const result = store.changes();

            expect(result.added.map((u) => u.id)).toEqual(['b']);
            expect(result.removed.map((u) => u.id)).toEqual(['a']);
        });

        it('повторная установка того же значения даёт пустую дельту', () => {
            const initial = [{id: 'a', name: 'A'}];
            const {Store, usersSignal} = createUserDiffStore(initial);
            const store = TestBed.inject(Store);

            store.changes();

            // тот же массив (по identity)
            usersSignal.set(initial);
            // ...или с тем же содержимым по id
            usersSignal.set([{id: 'a', name: 'A'}]);

            const result = store.changes();

            expect(result.added).toEqual([]);
            expect(result.removed).toEqual([]);
        });
    });

    describe('опция eager', () => {
        it('eager: true (по умолчанию) отслеживает изменения между двумя последними значениями source', () => {
            const {Store, usersSignal} = createUserDiffStore([{id: 'a', name: 'A'}]);
            const store = TestBed.inject(Store);

            // дать effect-у отработать
            flushEffects();

            // несколько изменений без чтения changes
            usersSignal.set([
                {id: 'a', name: 'A'},
                {id: 'b', name: 'B'},
            ]);
            flushEffects();

            usersSignal.set([
                {id: 'a', name: 'A'},
                {id: 'b', name: 'B'},
                {id: 'c', name: 'C'},
            ]);
            flushEffects();

            // дельта только между двумя последними: [a,b] → [a,b,c]
            const result = store.changes();

            expect(result.added.map((u) => u.id)).toEqual(['c']);
            expect(result.removed).toEqual([]);
        });

        it('eager: false не активирует подписку до первого чтения — дельта накапливается', () => {
            const {Store, usersSignal} = createUserDiffStore([{id: 'a', name: 'A'}], {
                eager: false,
            });
            const store = TestBed.inject(Store);

            // НЕ читаем changes
            usersSignal.set([
                {id: 'a', name: 'A'},
                {id: 'b', name: 'B'},
            ]);

            usersSignal.set([
                {id: 'b', name: 'B'},
                {id: 'c', name: 'C'},
            ]);

            // Первое чтение: дельта между initial (для linkedSignal — undefined)
            // и текущим [b, c]. То есть added: [b, c], removed: [].
            const result = store.changes();

            expect(result.added.map((u) => u.id).sort()).toEqual(['b', 'c']);
            expect(result.removed).toEqual([]);
        });
    });

    describe('edge cases', () => {
        it('source возвращающий undefined трактуется как пустой массив', () => {
            const usersSignal = signal<User[] | undefined>(undefined);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_src: usersSignal})),
                withDiffChanges({
                    // фича сама нормализует undefined -> []
                    source: (s) => s._src as never,
                    selectId: (u: User) => u.id,
                }),
                withProps(({_changes}) => ({changes: _changes})),
            );
            const store = TestBed.inject(Store);

            expect(store.changes()).toEqual({added: [], removed: []});

            usersSignal.set([{id: 'a', name: 'A'}]);
            const result = store.changes();

            expect(result.added.map((u) => u.id)).toEqual(['a']);
            expect(result.removed).toEqual([]);
        });

        it('сравнение по selectId — разные объекты с одним id не дают дельту', () => {
            const {Store, usersSignal} = createUserDiffStore([{id: 'a', name: 'A'}]);
            const store = TestBed.inject(Store);

            store.changes();

            // новый объект с тем же id
            usersSignal.set([{id: 'a', name: 'A renamed'}]);

            const result = store.changes();

            expect(result.added).toEqual([]);
            expect(result.removed).toEqual([]);
        });
    });

    describe('кастомное имя', () => {
        it('с name: "proposal" создаёт _proposalChanges', () => {
            const proposals = signal<User[]>([{id: 'p1', name: 'P1'}]);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_src: proposals})),
                withDiffChanges({
                    name: 'proposal',
                    source: (s) => s._src,
                    selectId: (u: User) => u.id,
                }),
                withProps(({_proposalChanges}) => ({
                    proposalChanges: _proposalChanges,
                })),
            );
            const store = TestBed.inject(Store);

            const result = store.proposalChanges();

            expect(result.added.map((u) => u.id)).toEqual(['p1']);
            expect(result.removed).toEqual([]);
        });

        it('две фичи с разными именами отслеживают независимо', () => {
            const proposals = signal<User[]>([{id: 'p1', name: 'P1'}]);
            const users = signal<User[]>([{id: 'u1', name: 'U1'}]);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({
                    _proposalsSrc: proposals,
                    _usersSrc: users,
                })),
                withDiffChanges({
                    name: 'proposal',
                    source: (s) => s._proposalsSrc,
                    selectId: (u: User) => u.id,
                }),
                withDiffChanges({
                    name: 'user',
                    source: (s) => s._usersSrc,
                    selectId: (u: User) => u.id,
                }),
                withProps(({_proposalChanges, _userChanges}) => ({
                    proposalChanges: _proposalChanges,
                    userChanges: _userChanges,
                })),
            );
            const store = TestBed.inject(Store);

            // initial: обе фичи считают всё как added
            expect(store.proposalChanges().added.map((u) => u.id)).toEqual(['p1']);
            expect(store.userChanges().added.map((u) => u.id)).toEqual(['u1']);

            // Меняем только proposals
            proposals.set([
                {id: 'p1', name: 'P1'},
                {id: 'p2', name: 'P2'},
            ]);

            // proposalChanges пересчиталась
            expect(store.proposalChanges().added.map((u) => u.id)).toEqual(['p2']);
            expect(store.proposalChanges().removed).toEqual([]);

            // userChanges НЕ пересчитывалась — осталась с initial-дельтой
            expect(store.userChanges().added.map((u) => u.id)).toEqual(['u1']);
            expect(store.userChanges().removed).toEqual([]);

            // Теперь меняем users — proposalChanges не должна тронуться
            users.set([]);

            expect(store.userChanges().added).toEqual([]);
            expect(store.userChanges().removed.map((u) => u.id)).toEqual(['u1']);

            // proposalChanges всё ещё последняя дельта
            expect(store.proposalChanges().added.map((u) => u.id)).toEqual(['p2']);
        });
    });
});
