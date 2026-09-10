import {computed, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {signalStore, withMethods, withProps} from '@ngrx/signals';

import {withEntityIndex} from './with-entity-index.feature';

type User = {id: string; name: string};

const USERS: readonly User[] = [
    {id: 'u1', name: 'Alice'},
    {id: 'u2', name: 'Bob'},
    {id: 'u3', name: 'Carol'},
];

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createUserIndexStore(initial: readonly User[] = USERS) {
    const usersSignal = signal<readonly User[]>(initial);

    const Store = signalStore(
        {providedIn: 'root'},
        withProps(() => ({_usersSource: usersSignal.asReadonly()})),
        withEntityIndex({
            items: (s) => s._usersSource,
            selectId: (u: User) => u.id,
        }),
        withProps(({_Ids, _getById}) => ({
            ids: _Ids,
            byId: _getById,
        })),
        withMethods(({_getById, _hasId}) => ({
            getById: _getById,
            hasId: _hasId,
        })),
    );

    return {Store, usersSignal};
}

describe('withEntityIndex', () => {
    describe('базовые поля и методы', () => {
        it('создаёт сигнал ids и метод byId', () => {
            const {Store} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(typeof store.ids).toBe('function');
            expect(typeof store.byId).toBe('function');
        });

        it('создаёт методы getById и hasId', () => {
            const {Store} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(typeof store.getById).toBe('function');
            expect(typeof store.hasId).toBe('function');
        });

        it('ids() возвращает идентификаторы в порядке входного массива', () => {
            const {Store} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.ids()).toEqual(['u1', 'u2', 'u3']);
        });

        it('byId(id) возвращает entity по идентификатору', () => {
            const {Store} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.byId('u1')).toEqual({id: 'u1', name: 'Alice'});
            expect(store.byId('u2')).toEqual({id: 'u2', name: 'Bob'});
            expect(store.byId('u3')).toEqual({id: 'u3', name: 'Carol'});
            expect(store.byId('unknown')).toBeUndefined();
        });
    });

    describe('методы доступа', () => {
        it('getById(existing) возвращает элемент', () => {
            const {Store} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.getById('u2')).toEqual({id: 'u2', name: 'Bob'});
        });

        it('getById(unknown) возвращает undefined', () => {
            const {Store} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.getById('unknown')).toBeUndefined();
        });

        it('hasId возвращает true для существующего, false для отсутствующего', () => {
            const {Store} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.hasId('u1')).toBe(true);
            expect(store.hasId('unknown')).toBe(false);
        });
    });

    describe('реактивность', () => {
        it('при изменении items ids() пересчитывается', () => {
            const {Store, usersSignal} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.ids()).toEqual(['u1', 'u2', 'u3']);

            usersSignal.set([
                {id: 'u4', name: 'Dave'},
                {id: 'u5', name: 'Eve'},
            ]);

            expect(store.ids()).toEqual(['u4', 'u5']);
        });

        it('при изменении items byId(id) возвращает актуальное значение', () => {
            const {Store, usersSignal} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.byId('u1')?.name).toBe('Alice');

            usersSignal.set([{id: 'u1', name: 'Alice Updated'}]);

            expect(store.byId('u1')?.name).toBe('Alice Updated');
        });

        it('при изменении items getById возвращает актуальное значение', () => {
            const {Store, usersSignal} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.getById('u1')?.name).toBe('Alice');

            usersSignal.set([{id: 'u1', name: 'Renamed'}]);

            expect(store.getById('u1')?.name).toBe('Renamed');
        });

        it('после удаления элемента getById возвращает undefined', () => {
            const {Store, usersSignal} = createUserIndexStore();
            const store = TestBed.inject(Store);

            expect(store.hasId('u1')).toBe(true);

            usersSignal.set(USERS.filter((u) => u.id !== 'u1'));

            expect(store.hasId('u1')).toBe(false);
            expect(store.getById('u1')).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('пустой массив даёт пустой ids и неопределённый byId для любого ключа', () => {
            const {Store} = createUserIndexStore([]);
            const store = TestBed.inject(Store);

            expect(store.ids()).toEqual([]);
            expect(store.byId('u1')).toBeUndefined();
            expect(store.hasId('u1')).toBe(false);
        });

        it('при дубликатах id byId возвращает последний элемент с этим id', () => {
            const {Store} = createUserIndexStore([
                {id: 'u1', name: 'First'},
                {id: 'u1', name: 'Second'},
                {id: 'u2', name: 'Other'},
            ]);
            const store = TestBed.inject(Store);

            // ids сохраняет порядок и дубликаты
            expect(store.ids()).toEqual(['u1', 'u1', 'u2']);

            // byId дедуплицирован: побеждает последний с этим id
            expect(store.byId('u1')?.name).toBe('Second');
            expect(store.byId('u2')?.name).toBe('Other');
        });
    });

    describe('кастомное имя', () => {
        it('с name: "proposal" пробрасывает _proposalIds, _getProposalById, _hasProposalId', () => {
            const usersSignal = signal<readonly User[]>(USERS);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_src: usersSignal.asReadonly()})),
                withEntityIndex({
                    name: 'proposal',
                    items: (s) => s._src,
                    selectId: (u: User) => u.id,
                }),
                withProps(({_proposalIds}) => ({
                    proposalIds: _proposalIds,
                })),
                withMethods(({_getProposalById, _hasProposalId}) => ({
                    getProposalById: _getProposalById,
                    hasProposalId: _hasProposalId,
                })),
            );
            const store = TestBed.inject(Store);

            expect(store.proposalIds()).toEqual(['u1', 'u2', 'u3']);
            expect(store.getProposalById('u2')?.name).toBe('Bob');
            expect(store.hasProposalId('u3')).toBe(true);
            expect(store.hasProposalId('unknown')).toBe(false);
        });

        it('два индекса с разными именами не конфликтуют', () => {
            type Item = {id: string; label: string};
            const proposals = signal<readonly Item[]>([
                {id: 'p1', label: 'P1'},
                {id: 'p2', label: 'P2'},
            ]);
            const users = signal<readonly Item[]>([{id: 'u1', label: 'U1'}]);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({
                    _proposalsSrc: proposals.asReadonly(),
                    _usersSrc: users.asReadonly(),
                })),
                withEntityIndex({
                    name: 'proposal',
                    items: (s) => s._proposalsSrc,
                    selectId: (x: Item) => x.id,
                }),
                withEntityIndex({
                    name: 'user',
                    items: (s) => s._usersSrc,
                    selectId: (x: Item) => x.id,
                }),
                withProps(({_proposalIds, _userIds}) => ({
                    proposalIds: _proposalIds,
                    userIds: _userIds,
                })),
                withMethods(
                    ({_getProposalById, _getUserById, _hasProposalId, _hasUserId}) => ({
                        getProposalById: _getProposalById,
                        getUserById: _getUserById,
                        hasProposalId: _hasProposalId,
                        hasUserId: _hasUserId,
                    }),
                ),
            );
            const store = TestBed.inject(Store);

            expect(store.proposalIds()).toEqual(['p1', 'p2']);
            expect(store.userIds()).toEqual(['u1']);

            expect(store.getProposalById('p1')?.label).toBe('P1');
            expect(store.getUserById('u1')?.label).toBe('U1');

            expect(store.hasProposalId('u1')).toBe(false);
            expect(store.hasUserId('p1')).toBe(false);
        });
    });

    describe('источник данных', () => {
        it('items может быть computed от другого сигнала в store', () => {
            const all = signal<readonly User[]>(USERS);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_all: all.asReadonly()})),
                withEntityIndex({
                    items: (s) => computed(() => s._all().filter((u) => u.id !== 'u2')),
                    selectId: (u: User) => u.id,
                }),
                withProps(({_Ids}) => ({ids: _Ids})),
                withMethods(({_hasId}) => ({hasId: _hasId})),
            );
            const store = TestBed.inject(Store);

            expect(store.ids()).toEqual(['u1', 'u3']);
            expect(store.hasId('u2')).toBe(false);
            expect(store.hasId('u1')).toBe(true);

            all.set([
                {id: 'u9', name: 'New'},
                {id: 'u2', name: 'Bob'},
            ]);

            expect(store.ids()).toEqual(['u9']);
        });
    });
});
