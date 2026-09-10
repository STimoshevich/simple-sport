import {computed, inject} from '@angular/core';
import {patchState, signalStore, withMethods, withProps, withState} from '@ngrx/signals';
import {todayLocal, withRxResourceState} from '@simple-sport/shared';
import {map} from 'rxjs';
import {
    copyHistoryFilters,
    EMPTY_HISTORY_FILTERS,
    HistoryFiltersState,
    hasActiveHistoryFilters,
    parseHistoryFilters,
    serializeHistoryFilters,
    emptyHistoryFilters,
    SettingsService,
} from '@simple-sport/integration';

export const FeedUiStore = signalStore(
    {providedIn: 'root'},
    withProps(() => ({
        _api: inject(SettingsService),
    })),
    withState({
        anchorDate: todayLocal(),
        scrollOffset: 0,
    }),
    withRxResourceState({
        name: 'filters',
        eager: true,
        loader: ({store}) =>
            store._api
                .getSettings()
                .pipe(map((settings) => parseHistoryFilters(settings.uiFeedFilters))),
    }),
    withProps((store) => ({
        filters: computed(() => store._filters() ?? EMPTY_HISTORY_FILTERS),
        ready: computed(
            () =>
                store._filters() !== undefined ||
                store._filtersMeta.status() === 'resolved' ||
                !!store._filtersMeta.error(),
        ),
        hasActiveFilters: computed(() =>
            hasActiveHistoryFilters(store._filters() ?? EMPTY_HISTORY_FILTERS),
        ),
    })),
    withMethods((store) => ({
        setFilters(filters: HistoryFiltersState): void {
            const next = copyHistoryFilters(filters);
            store._updateFilters(() => next);
            store._api.patch({uiFeedFilters: serializeHistoryFilters(next)}).subscribe();
        },
        resetFilters(): void {
            const filters = emptyHistoryFilters();
            store._updateFilters(() => filters);
            store._api
                .patch({uiFeedFilters: serializeHistoryFilters(filters)})
                .subscribe();
        },
        setAnchorDate(date: string): void {
            patchState(store, {anchorDate: date});
        },
        setScrollOffset(offset: number): void {
            patchState(store, {scrollOffset: offset});
        },
    })),
);
