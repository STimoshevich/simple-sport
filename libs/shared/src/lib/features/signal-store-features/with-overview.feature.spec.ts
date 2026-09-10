import {inject, Injectable, Signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {TestBed} from '@angular/core/testing';
import {signalStore, withProps} from '@ngrx/signals';
import {filter, firstValueFrom, Observable, of, Subject, throwError} from 'rxjs';

import {OverviewPagedResult} from '../types';
import {
    OverviewMeta,
    OverviewRequest,
    OverviewSorting,
    withOverview,
} from './with-overview.feature';

type TestItem = {id: number};
type TestFilters = {search?: string};
type TestSort = 'id' | 'name';

async function awaitResolved(store: {meta: Signal<OverviewMeta>}): Promise<void> {
    await TestBed.runInInjectionContext(async () => {
        await firstValueFrom(
            toObservable(store.meta).pipe(
                filter((m) => m.status === 'resolved' || m.status === 'error'),
            ),
        );
    });
}

@Injectable({providedIn: 'root'})
class TestApiService {
    readonly getMock = vi.fn();

    get(
        request: OverviewRequest<TestFilters, TestSort>,
    ): Observable<OverviewPagedResult<TestItem>> {
        return this.getMock(request);
    }
}

function makeItems(from: number, count: number): TestItem[] {
    return Array.from({length: count}, (_, index) => ({id: from + index}));
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function setup() {
    const TestOverviewStore = signalStore(
        withProps(() => ({_api: inject(TestApiService)})),
        withOverview<TestFilters, TestSort>()({
            itemsPerPage: 10,
            loader: (request, store) => store._api.get(request),
        }),
    );

    TestBed.configureTestingModule({providers: [TestOverviewStore]});
    const store = TestBed.inject(TestOverviewStore);
    const api = TestBed.inject(TestApiService);

    api.getMock.mockReset();

    return {store, api};
}

describe('withOverview', () => {
    it('не должен делать запрос при создании store (lazy)', async () => {
        const {store, api} = setup();

        expect(store.items()).toEqual([]);
        expect(store.totalCount()).toBe(0);
        expect(store.pagesCount()).toBe(0);
        expect(store.page()).toBe(1);
        expect(store.meta().isLoading).toBe(false);
        expect(store.meta().error).toBeUndefined();

        await Promise.resolve();
        await Promise.resolve();

        expect(api.getMock).not.toHaveBeenCalled();
    });

    it('должен делать запрос при setFilters и обновлять items/totalCount/pagesCount', async () => {
        const {store, api} = setup();

        api.getMock.mockReturnValue(of({items: makeItems(1, 2), totalCount: 21}));

        store.setFilters({search: 'angular'});
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenCalledTimes(1);
        expect(api.getMock).toHaveBeenLastCalledWith({
            page: 1,
            offset: 0,
            itemsPerPage: 10,
            filters: {search: 'angular'},
            sorting: [],
        });
        expect(store.items()).toEqual(makeItems(1, 2));
        expect(store.totalCount()).toBe(21);
        expect(store.pagesCount()).toBe(3);
        expect(store.page()).toBe(1);
        expect(store.meta().isLoading).toBe(false);
        expect(store.meta().error).toBeUndefined();
    });

    it('должен переходить на следующую страницу через nextPage()', async () => {
        const {store, api} = setup();

        api.getMock
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 25}))
            .mockReturnValueOnce(of({items: makeItems(11, 10), totalCount: 25}));

        //тригерим запрос
        store.setFilters({search: 'first'});
        await awaitResolved(store);
        store.nextPage();
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenCalledTimes(2);
        expect(api.getMock).toHaveBeenNthCalledWith(2, {
            page: 2,
            offset: 10,
            itemsPerPage: 10,
            filters: {search: 'first'},
            sorting: [],
        });
        expect(store.page()).toBe(2);
        expect(store.items()).toEqual(makeItems(11, 10));
    });

    it('должен переходить на конкретную страницу через setPage()', async () => {
        const {store, api} = setup();

        api.getMock
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 50}))
            .mockReturnValueOnce(of({items: makeItems(31, 10), totalCount: 50}));

        store.setFilters({search: 'q'});
        await awaitResolved(store);
        store.setPage(4);
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenLastCalledWith({
            page: 4,
            offset: 30,
            itemsPerPage: 10,
            filters: {search: 'q'},
            sorting: [],
        });
        expect(store.page()).toBe(4);
    });

    it('не должен сбрасывать страницу при setFilters(..., {resetPage: false})', async () => {
        const {store, api} = setup();

        api.getMock
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 35}))
            .mockReturnValueOnce(of({items: makeItems(21, 10), totalCount: 35}))
            .mockReturnValueOnce(of({items: makeItems(21, 5), totalCount: 25}));

        store.setFilters({search: 'before'});
        await awaitResolved(store);
        store.setPage(3);
        await awaitResolved(store);
        store.setFilters({search: 'after'}, {resetPage: false});
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenCalledTimes(3);
        expect(api.getMock).toHaveBeenNthCalledWith(3, {
            page: 3,
            offset: 20,
            itemsPerPage: 10,
            filters: {search: 'after'},
            sorting: [],
        });
        expect(store.page()).toBe(3);
    });

    it('должен сбрасывать страницу на 1 при setSorting()', async () => {
        const {store, api} = setup();
        const sorting: Array<OverviewSorting<TestSort>> = [
            {sortBy: 'name', direction: 'ASC'},
        ];

        api.getMock
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 30}))
            .mockReturnValueOnce(of({items: makeItems(21, 10), totalCount: 30}))
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 30}));

        store.setFilters({search: 'angular'});
        await awaitResolved(store);
        store.setPage(3);
        await awaitResolved(store);
        store.setSorting(sorting);
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenCalledTimes(3);
        expect(api.getMock).toHaveBeenNthCalledWith(3, {
            page: 1,
            offset: 0,
            itemsPerPage: 10,
            filters: {search: 'angular'},
            sorting,
        });
        expect(store.page()).toBe(1);
    });

    it('reload() должен повторять запрос с текущими параметрами', async () => {
        const {store, api} = setup();

        api.getMock
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 30}))
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 30}));

        store.setFilters({search: 'reload-me'});
        await awaitResolved(store);
        store.reload();
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenCalledTimes(2);
        expect(api.getMock).toHaveBeenNthCalledWith(2, {
            page: 1,
            offset: 0,
            itemsPerPage: 10,
            filters: {search: 'reload-me'},
            sorting: [],
        });
    });

    it('должен переключаться на последнюю доступную страницу, если текущая стала пустой', async () => {
        const {store, api} = setup();
        const lastPageItems = makeItems(11, 5);

        api.getMock
            .mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 25}))
            .mockReturnValueOnce(of({items: makeItems(21, 5), totalCount: 25}))
            .mockReturnValueOnce(of({items: [], totalCount: 15}))
            .mockReturnValueOnce(of({items: lastPageItems, totalCount: 15}));

        store.setFilters({search: 'reload-after-delete'});
        await awaitResolved(store);
        store.setPage(3);
        await awaitResolved(store);
        store.reload();
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenCalledTimes(4);
        expect(api.getMock).toHaveBeenNthCalledWith(3, {
            page: 3,
            offset: 20,
            itemsPerPage: 10,
            filters: {search: 'reload-after-delete'},
            sorting: [],
        });
        expect(api.getMock).toHaveBeenNthCalledWith(4, {
            page: 2,
            offset: 10,
            itemsPerPage: 10,
            filters: {search: 'reload-after-delete'},
            sorting: [],
        });
        expect(store.page()).toBe(2);
        expect(store.items()).toEqual(lastPageItems);
        expect(store.totalCount()).toBe(15);
        expect(store.pagesCount()).toBe(2);
    });

    it('должен публиковать ошибку в meta.error и отдавать пустой результат', async () => {
        const {store, api} = setup();
        const backendError = new Error('boom');

        api.getMock.mockReturnValue(throwError(() => backendError));

        store.setFilters({search: 'error-case'});
        await awaitResolved(store);

        expect(api.getMock).toHaveBeenCalledTimes(1);
        expect(store.meta().error).toBe(backendError);
        expect(store.meta().isLoading).toBe(false);
        expect(store.items()).toEqual([]);
        expect(store.totalCount()).toBe(0);
        expect(store.pagesCount()).toBe(0);
    });

    it('должен корректно вычислять pagesCount для разных totalCount', async () => {
        const {store, api} = setup();

        api.getMock.mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 30}));
        store.setFilters({search: 'a'});
        await awaitResolved(store);
        expect(store.pagesCount()).toBe(3);

        api.getMock.mockReturnValueOnce(of({items: makeItems(1, 10), totalCount: 31}));
        store.setFilters({search: 'b'});
        await awaitResolved(store);
        expect(store.pagesCount()).toBe(4);

        api.getMock.mockReturnValueOnce(of({items: [], totalCount: 0}));
        store.setFilters({search: 'c'});
        await awaitResolved(store);
        expect(store.pagesCount()).toBe(0);
    });

    it('items должны сохранять предыдущие значения, пока идёт перезагрузка', async () => {
        const {store, api} = setup();

        const firstBatch = makeItems(1, 10);

        api.getMock.mockReturnValueOnce(of({items: firstBatch, totalCount: 30}));

        store.setFilters({search: 'first'});
        await awaitResolved(store);
        expect(store.items()).toEqual(firstBatch);

        // Второй запрос — pending
        const pending = new Subject<OverviewPagedResult<TestItem>>();

        api.getMock.mockReturnValueOnce(pending.asObservable());

        store.reload();

        // Ждём, пока rxResource реально подпишется на наш Subject
        await waitFor(() => api.getMock.mock.calls.length === 2);

        // Теперь резерв «in-flight», подписка активна
        expect(store.meta().isLoading).toBe(true);
        expect(store.items()).toEqual(firstBatch);
        expect(store.totalCount()).toBe(30);
        expect(store.pagesCount()).toBe(3);

        // John второй запрос
        const secondBatch = makeItems(100, 5);

        pending.next({items: secondBatch, totalCount: 5});
        pending.complete();

        await awaitResolved(store);

        expect(store.items()).toEqual(secondBatch);
        expect(store.totalCount()).toBe(5);
    });

    async function waitFor(predicate: () => boolean, timeout = 1000): Promise<void> {
        const start = Date.now();

        while (!predicate()) {
            if (Date.now() - start > timeout) {
                throw new Error('waitFor timeout');
            }
            await new Promise((r) => setTimeout(r, 5));
        }
    }
});
