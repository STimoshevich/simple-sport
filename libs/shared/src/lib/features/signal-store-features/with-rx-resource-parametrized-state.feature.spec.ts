import {ApplicationRef, ResourceStatus, Signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {TestBed} from '@angular/core/testing';
import {signalStore, withMethods, withProps} from '@ngrx/signals';
import {filter, firstValueFrom, Observable, of, throwError} from 'rxjs';

import {withRxResourceParametrizedState} from './with-rx-resource-parametrized-state.feature';

type PublicRef<T> = {
    value: Signal<T | undefined>;
    isLoading: Signal<boolean>;
    error: Signal<Error | undefined>;
    status: Signal<ResourceStatus>;
    reload: () => boolean;
};

function flushEffects(): void {
    TestBed.inject(ApplicationRef).tick();
}

async function awaitResolved<T>(ref: PublicRef<T>): Promise<void> {
    await TestBed.runInInjectionContext(async () => {
        await firstValueFrom(
            toObservable(ref.status).pipe(
                filter((s) => s === 'resolved' || s === 'error'),
            ),
        );
    });
}

/**
 * Простая фабрика типичного store: один resource без `name`,
 * проброшены `data` и `update` под публичными именами.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createSimpleStore<TRequest, TItem>(opts: {
    loader: (request: TRequest) => Observable<TItem>;
}) {
    return signalStore(
        {providedIn: 'root'},
        withRxResourceParametrizedState({
            loader: (request: TRequest) => opts.loader(request),
        }),
        withProps(({_data}) => ({data: _data})),
        withMethods(({_update}) => ({
            update: (
                request: TRequest,
                updater: (curr: TItem | undefined) => TItem | undefined,
            ): void => _update(request, updater),
        })),
    );
}

describe('withRxResourceParametrizedStateFeature', () => {
    describe('базовое поведение', () => {
        it('_data(request) возвращает ref с полями value, isLoading, error, status, reload', () => {
            const Store = createSimpleStore({
                loader: (id: number) => of(`v:${id}`),
            });
            const store = TestBed.inject(Store);
            const ref = store.data(1);

            expect(typeof ref.value).toBe('function');
            expect(typeof ref.isLoading).toBe('function');
            expect(typeof ref.error).toBe('function');
            expect(typeof ref.status).toBe('function');
            expect(typeof ref.reload).toBe('function');
        });

        it('загружает данные при первом обращении к _data(request)', async () => {
            const Store = createSimpleStore({
                loader: (id: number) => of(`v:${id}`),
            });
            const store = TestBed.inject(Store);
            const ref = store.data(1);

            await awaitResolved(ref);
            expect(ref.value()).toBe('v:1');
            expect(ref.error()).toBeUndefined();
        });

        it('не вызывает loader, пока _data(request) не вызван', async () => {
            const loader = vi.fn((id: number) => of(`v:${id}`));
            const Store = createSimpleStore({loader});

            TestBed.inject(Store);

            flushEffects();
            await Promise.resolve();

            expect(loader).not.toHaveBeenCalled();
        });
    });

    describe('кэширование', () => {
        it('повторный _data(request) с тем же ключом возвращает тот же ref', () => {
            const Store = createSimpleStore({
                loader: (id: number) => of(`v:${id}`),
            });
            const store = TestBed.inject(Store);

            const ref1 = store.data(1);
            const ref2 = store.data(1);

            expect(ref1).toBe(ref2);
        });

        it('_data(request1) и _data(request2) возвращают разные ref', () => {
            const Store = createSimpleStore({
                loader: (id: number) => of(`v:${id}`),
            });
            const store = TestBed.inject(Store);

            const ref1 = store.data(1);
            const ref2 = store.data(2);

            expect(ref1).not.toBe(ref2);
        });

        it('разные ключи приводят к независимым вызовам loader', async () => {
            const loader = vi.fn((id: number) => of(`v:${id}`));
            const Store = createSimpleStore({loader});
            const store = TestBed.inject(Store);

            const ref1 = store.data(1);
            const ref2 = store.data(2);

            await awaitResolved(ref1);
            await awaitResolved(ref2);

            expect(loader).toHaveBeenCalledTimes(2);
            expect(loader).toHaveBeenCalledWith(1);
            expect(loader).toHaveBeenCalledWith(2);
            expect(ref1.value()).toBe('v:1');
            expect(ref2.value()).toBe('v:2');
        });

        it('повторный _data(request) с тем же ключом не вызывает loader повторно', async () => {
            const loader = vi.fn((id: number) => of(`v:${id}`));
            const Store = createSimpleStore({loader});
            const store = TestBed.inject(Store);

            const ref1 = store.data(1);

            await awaitResolved(ref1);
            expect(loader).toHaveBeenCalledTimes(1);

            store.data(1);
            store.data(1);

            expect(loader).toHaveBeenCalledTimes(1);
        });

        it('структурно равные объекты-ключи возвращают тот же ref', () => {
            const Store = createSimpleStore({
                loader: (req: {id: number; page: number}) =>
                    of(`v:${req.id}:${req.page}`),
            });
            const store = TestBed.inject(Store);

            const ref1 = store.data({id: 1, page: 0});
            const ref2 = store.data({id: 1, page: 0});

            expect(ref1).toBe(ref2);
        });
    });

    describe('update', () => {
        it('_update(request, updater) меняет value существующего ресурса', async () => {
            const Store = createSimpleStore({
                loader: (id: number) => of({id, name: `name-${id}`}),
            });
            const store = TestBed.inject(Store);
            const ref = store.data(1);

            await awaitResolved(ref);
            expect(ref.value()).toEqual({id: 1, name: 'name-1'});

            store.update(1, (curr) => ({...curr!, name: 'updated'}));

            expect(ref.value()).toEqual({id: 1, name: 'updated'});
        });

        it('_update(unknownRequest, ...) тихо игнорируется (не падает)', () => {
            const Store = createSimpleStore({
                loader: (id: number) => of(`v:${id}`),
            });
            const store = TestBed.inject(Store);

            expect(() => store.update(999, (curr) => curr)).not.toThrow();
        });

        it('_update не вызывает loader повторно', async () => {
            const loader = vi.fn((id: number) => of(`v:${id}`));
            const Store = createSimpleStore({loader});
            const store = TestBed.inject(Store);
            const ref = store.data(1);

            await awaitResolved(ref);
            expect(loader).toHaveBeenCalledTimes(1);

            store.update(1, () => 'manual');

            expect(loader).toHaveBeenCalledTimes(1);
            expect(ref.value()).toBe('manual');
        });
    });

    describe('reload', () => {
        it('ref.reload() повторно вызывает loader для своего ключа', async () => {
            const loader = vi.fn((id: number) => of(`v:${id}`));
            const Store = createSimpleStore({loader});
            const store = TestBed.inject(Store);
            const ref = store.data(1);

            await awaitResolved(ref);
            expect(loader).toHaveBeenCalledTimes(1);

            ref.reload();
            await awaitResolved(ref);

            expect(loader).toHaveBeenCalledTimes(2);
        });

        it('ref.reload() не затрагивает другие ключи', async () => {
            const loader = vi.fn((id: number) => of(`v:${id}`));
            const Store = createSimpleStore({loader});
            const store = TestBed.inject(Store);

            const ref1 = store.data(1);
            const ref2 = store.data(2);

            await awaitResolved(ref1);
            await awaitResolved(ref2);
            expect(loader).toHaveBeenCalledTimes(2);

            ref1.reload();
            await awaitResolved(ref1);

            expect(loader).toHaveBeenCalledTimes(3);
            expect(loader).toHaveBeenLastCalledWith(1);
        });
    });

    describe('ошибки', () => {
        it('при ошибке loader-а ref.error() содержит ошибку, isLoading() === false', async () => {
            const err = new Error('boom');
            const Store = createSimpleStore({
                loader: () => throwError(() => err),
            });
            const store = TestBed.inject(Store);
            const ref = store.data(1);

            await awaitResolved(ref);

            expect(ref.error()).toBe(err);
            expect(ref.isLoading()).toBe(false);
        });

        it('ошибка одного ключа не влияет на другой', async () => {
            const Store = createSimpleStore({
                loader: (id: number) =>
                    id === 1 ? throwError(() => new Error('fail')) : of(`v:${id}`),
            });
            const store = TestBed.inject(Store);

            const ref1 = store.data(1);
            const ref2 = store.data(2);

            await awaitResolved(ref1);
            await awaitResolved(ref2);

            expect(ref1.error()).toBeInstanceOf(Error);
            expect(ref2.error()).toBeUndefined();
            expect(ref2.value()).toBe('v:2');
        });
    });

    describe('кастомное имя', () => {
        it('с name: "avatar" создаёт поля _avatar и _updateAvatar', async () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceParametrizedState({
                    name: 'avatar',
                    loader: (id: number) => of(`avatar:${id}`),
                }),
                withProps(({_avatar}) => ({
                    avatar: _avatar,
                })),
                withMethods(({_updateAvatar}) => ({
                    updateAvatar: _updateAvatar,
                })),
            );
            const store = TestBed.inject(Store);

            expect(typeof store.avatar).toBe('function');
            expect(typeof store.updateAvatar).toBe('function');

            const ref = store.avatar(1);

            await awaitResolved(ref);
            expect(ref.value()).toBe('avatar:1');

            store.updateAvatar(1, () => 'changed');
            expect(ref.value()).toBe('changed');
        });
    });

    describe('множественные ресурсы в одном store', () => {
        it('поддерживает несколько withRxResourceParametrizedStateFeature с разными именами', async () => {
            const loaderProposal = vi.fn((id: number) => of(`p:${id}`));
            const loaderHistory = vi.fn((id: number) => of(`h:${id}`));

            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceParametrizedState({
                    loader: loaderProposal,
                }),
                withRxResourceParametrizedState({
                    name: 'history',
                    loader: loaderHistory,
                }),
                withProps(({_data, _history}) => ({
                    proposal: _data,
                    history: _history,
                })),
            );
            const store = TestBed.inject(Store);

            const p = store.proposal(1);
            const h = store.history(1);

            await awaitResolved(p);
            await awaitResolved(h);

            expect(p).not.toBe(h);
            expect(p.value()).toBe('p:1');
            expect(h.value()).toBe('h:1');
            expect(loaderProposal).toHaveBeenCalledTimes(1);
            expect(loaderHistory).toHaveBeenCalledTimes(1);
        });

        it('одинаковый ключ в разных фичах кеширует независимо', async () => {
            const loaderA = vi.fn((id: number) => of(`a:${id}`));
            const loaderB = vi.fn((id: number) => of(`b:${id}`));

            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceParametrizedState({name: 'a', loader: loaderA}),
                withRxResourceParametrizedState({name: 'b', loader: loaderB}),
                withProps(({_a, _b}) => ({
                    a: _a,
                    b: _b,
                })),
            );
            const store = TestBed.inject(Store);

            const refA = store.a(42);
            const refB = store.b(42);

            await awaitResolved(refA);
            await awaitResolved(refB);

            expect(refA.value()).toBe('a:42');
            expect(refB.value()).toBe('b:42');
            expect(loaderA).toHaveBeenCalledTimes(1);
            expect(loaderB).toHaveBeenCalledTimes(1);

            // Повторный вызов с тем же ключом — кеш срабатывает в обеих независимо
            store.a(42);
            store.b(42);

            expect(loaderA).toHaveBeenCalledTimes(1);
            expect(loaderB).toHaveBeenCalledTimes(1);
        });
    });
});
