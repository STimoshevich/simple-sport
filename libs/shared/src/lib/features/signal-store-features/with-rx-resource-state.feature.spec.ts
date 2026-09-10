import {ApplicationRef, ResourceStatus, Signal, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {TestBed} from '@angular/core/testing';
import {signalStore, withMethods, withProps} from '@ngrx/signals';
import {filter, firstValueFrom, of, throwError} from 'rxjs';

import {withRxResourceState} from './with-rx-resource-state.feature';

type PublicMeta = {
    isLoading: Signal<boolean>;
    error: Signal<Error | undefined>;
    status: Signal<ResourceStatus>;
};

async function waitNotLoading(meta: PublicMeta): Promise<void> {
    await TestBed.runInInjectionContext(async () => {
        await firstValueFrom(
            toObservable(meta.isLoading).pipe(filter((v) => v === false)),
        );
    });
}

describe('withRxResourceState', () => {
    describe('загрузка данных', () => {
        it('должен загружать данные и отдавать через data() (eager)', async () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({
                    loader: () => of({foo: 'bar'}),
                    eager: true,
                }),
                withProps(({_data, _meta}) => ({
                    data: _data,
                    meta: _meta,
                })),
            );
            const store = TestBed.inject(Store);

            await waitNotLoading(store.meta);

            expect(store.data()).toEqual({foo: 'bar'});
            expect(store.meta.error()).toBeUndefined();
        });

        it('при eager: true должен делать запрос сразу после создания store', async () => {
            const loader = vi.fn().mockReturnValue(of(42));

            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({loader, eager: true}),
            );

            TestBed.inject(Store);

            TestBed.inject(ApplicationRef).tick();
            await Promise.resolve();

            expect(loader).toHaveBeenCalledTimes(1);
        });

        it('при eager: false (по умолчанию) не должен делать запрос, пока никто не подпишется', async () => {
            const loader = vi.fn().mockReturnValue(of(42));

            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({loader}),
            );

            TestBed.inject(Store);

            await Promise.resolve();
            await Promise.resolve();

            expect(loader).not.toHaveBeenCalled();
        });
    });

    describe('reload и update', () => {
        it('reload() должен повторять запрос', async () => {
            const loader = vi.fn().mockReturnValue(of(42));

            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({loader, eager: true}),
                withProps(({_meta}) => ({meta: _meta})),
                withMethods(({_reload}) => ({
                    reload: (): void => _reload(),
                })),
            );
            const store = TestBed.inject(Store);

            await waitNotLoading(store.meta);
            expect(loader).toHaveBeenCalledTimes(1);

            store.reload();
            await waitNotLoading(store.meta);

            expect(loader).toHaveBeenCalledTimes(2);
        });

        it('update() должен локально изменять data() без нового запроса', async () => {
            const loader = vi.fn(() => of({count: 1}));
            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({loader, eager: true}),
                withProps(({_data, _meta}) => ({data: _data, meta: _meta})),
                withMethods(({_update}) => ({
                    update: (
                        updater: (current: {count: number}) => {count: number},
                    ): void => {
                        _update(updater);
                    },
                })),
            );
            const store = TestBed.inject(Store);

            await waitNotLoading(store.meta);
            expect(store.data()).toEqual({count: 1});
            expect(loader).toHaveBeenCalledTimes(1);

            store.update((curr) => ({count: curr!.count + 10}));
            expect(store.data()).toEqual({count: 11});
            expect(loader).toHaveBeenCalledTimes(1);
        });
    });

    describe('requestValue', () => {
        it('должен перезагружать ресурс при изменении requestValue', async () => {
            const loader = vi
                .fn()
                .mockImplementation(({request}: {request: string}) => of(`v:${request}`));

            const idSignal = signal('a');

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_id: idSignal.asReadonly()})),
                withRxResourceState({
                    loader: ({request}) => loader({request}),
                    requestValue: (store) => store._id(),
                    eager: true,
                }),
                withProps(({_data, _meta}) => ({data: _data, meta: _meta})),
            );
            const store = TestBed.inject(Store);

            await waitNotLoading(store.meta);
            expect(loader).toHaveBeenCalledTimes(1);
            expect(loader).toHaveBeenLastCalledWith({request: 'a'});
            expect(store.data()).toBe('v:a');

            idSignal.set('b');
            await waitNotLoading(store.meta);

            expect(loader).toHaveBeenCalledTimes(2);
            expect(loader).toHaveBeenLastCalledWith({request: 'b'});
            expect(store.data()).toBe('v:b');
        });

        it('если requestValue() === undefined, запрос не должен выполняться', async () => {
            const loader = vi.fn().mockReturnValue(of(42));

            const idSignal = signal<string | undefined>(undefined);

            const Store = signalStore(
                {providedIn: 'root'},
                withProps(() => ({_id: idSignal.asReadonly()})),
                withRxResourceState({
                    loader,
                    requestValue: (store) => store._id(),
                    eager: true,
                }),
            );

            TestBed.inject(Store);

            await Promise.resolve();
            await Promise.resolve();

            expect(loader).not.toHaveBeenCalled();
        });
    });

    describe('normalize', () => {
        it('должен применять normalize к значению ресурса', async () => {
            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({
                    loader: () => of([1, 2, 3]),
                    normalize: (items) => items.map((x) => x * 10),
                    eager: true,
                }),
                withProps(({_data, _meta}) => ({data: _data, meta: _meta})),
            );
            const store = TestBed.inject(Store);

            await waitNotLoading(store.meta);
            expect(store.data()).toEqual([10, 20, 30]);
        });
    });

    describe('ошибки', () => {
        it('meta.error() должен содержать ошибку при провале запроса', async () => {
            const err = new Error('boom');

            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({
                    loader: () => throwError(() => err),
                    eager: true,
                }),
                withProps(({_meta}) => ({meta: _meta})),
            );
            const store = TestBed.inject(Store);

            await waitNotLoading(store.meta);

            expect(store.meta.error()).toBe(err);
            expect(store.meta.isLoading()).toBe(false);
        });
    });

    describe('множественные ресурсы', () => {
        it('должен поддерживать несколько withRxResourceState в одном store', async () => {
            const loaderA = vi.fn().mockReturnValue(of('A'));
            const loaderB = vi.fn().mockReturnValue(of('B'));

            const Store = signalStore(
                {providedIn: 'root'},
                withRxResourceState({name: 'first', loader: loaderA, eager: true}),
                withRxResourceState({name: 'second', loader: loaderB, eager: true}),
                withProps(({_first, _firstMeta, _second, _secondMeta}) => ({
                    first: _first,
                    firstMeta: _firstMeta,
                    second: _second,
                    secondMeta: _secondMeta,
                })),
                withMethods(({_reloadFirst}) => ({
                    reloadFirst: (): void => _reloadFirst(),
                })),
            );
            const store = TestBed.inject(Store);

            await waitNotLoading(store.firstMeta);
            await waitNotLoading(store.secondMeta);

            expect(store.first()).toBe('A');
            expect(store.second()).toBe('B');
            expect(loaderA).toHaveBeenCalledTimes(1);
            expect(loaderB).toHaveBeenCalledTimes(1);

            store.reloadFirst();
            await waitNotLoading(store.firstMeta);

            expect(loaderA).toHaveBeenCalledTimes(2);
            expect(loaderB).toHaveBeenCalledTimes(1);
        });
    });

    it('повторные update не накапливают эффект normalize (идемпотентность)', async () => {
        const normalize = vi.fn((items: number[]) => [...items].sort((a, b) => a - b));

        const Store = signalStore(
            {providedIn: 'root'},
            withRxResourceState({
                loader: () => of([3, 1, 2]),
                normalize,
                eager: true,
            }),
            withProps(({_data, _meta}) => ({data: _data, meta: _meta})),
            withMethods(({_update}) => ({
                update: (updater: (curr: number[]) => number[]): void => _update(updater),
            })),
        );
        const store = TestBed.inject(Store);

        await waitNotLoading(store.meta);
        expect(store.data()).toEqual([1, 2, 3]);

        store.update((curr) => [...curr, 5]);
        expect(store.data()).toEqual([1, 2, 3, 5]);

        store.update((curr) => [...curr, 0]);
        expect(store.data()).toEqual([0, 1, 2, 3, 5]);

        store.update((curr) => [...curr, 4]);
        expect(store.data()).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('requestEqual должен предотвращать повторный запрос, если requestValue семантически не изменился', async () => {
        const currentUserSignal = signal<{masterId: string} | undefined>({
            masterId: 'master-1',
        });
        const matrixIdSignal = signal('matrix-1');

        const loader = vi.fn(({request}) =>
            of(`${request?.masterId}:${request?.matrixId}`),
        );

        const Store = signalStore(
            {providedIn: 'root'},
            withProps(() => ({
                _currentUser: currentUserSignal.asReadonly(),
                _matrixId: matrixIdSignal.asReadonly(),
            })),
            withRxResourceState({
                requestValue: (store) => {
                    const user = store._currentUser();

                    if (!user) {
                        return undefined;
                    }

                    return {
                        matrixId: store._matrixId(),
                        masterId: user.masterId,
                    };
                },
                requestEqual: (prev, next) =>
                    prev?.matrixId === next?.matrixId &&
                    prev?.masterId === next?.masterId,
                loader,
                eager: true,
            }),
            withProps(({_data, _meta}) => ({
                data: _data,
                meta: _meta,
            })),
        );

        const store = TestBed.inject(Store);

        await waitNotLoading(store.meta);

        expect(loader).toHaveBeenCalledTimes(1);
        expect(loader).toHaveBeenLastCalledWith({
            request: {
                matrixId: 'matrix-1',
                masterId: 'master-1',
            },
            store: expect.anything(),
        });
        expect(store.data()).toBe('master-1:matrix-1');

        currentUserSignal.set({masterId: 'master-1'});

        await waitNotLoading(store.meta);

        expect(loader).toHaveBeenCalledTimes(1);
        expect(store.data()).toBe('master-1:matrix-1');

        matrixIdSignal.set('matrix-2');

        await waitNotLoading(store.meta);

        expect(loader).toHaveBeenCalledTimes(2);
        expect(loader).toHaveBeenLastCalledWith({
            request: {
                matrixId: 'matrix-2',
                masterId: 'master-1',
            },
            store: expect.anything(),
        });
        expect(store.data()).toBe('master-1:matrix-2');
    });
});
