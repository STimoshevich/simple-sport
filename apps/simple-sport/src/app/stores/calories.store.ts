import {computed, inject} from '@angular/core';
import {signalStore, withMethods, withProps} from '@ngrx/signals';
import {withRxResourceState} from '@simple-sport/shared';
import {Observable, tap} from 'rxjs';
import {CalorieRecord, FoodSqlService} from '@simple-sport/integration';

export const CaloriesStore = signalStore(
    withProps(() => ({
        _foodSql: inject(FoodSqlService),
    })),
    withRxResourceState({
        name: 'entries',
        eager: true,
        loader: ({store}) => store._foodSql.listToday(),
    }),
    withProps((store) => ({
        entries: computed(() => store._entries() ?? []),
        hasLoaded: computed(
            () => store._entries() !== undefined || !!store._entriesMeta.error(),
        ),
        isLoading: computed(() => store._entriesMeta.isLoading()),
        total: computed(() =>
            (store._entries() ?? []).reduce((sum, entry) => sum + entry.calories, 0),
        ),
        planned: computed(() => store._foodSql.getPlannedDailyCalories()),
    })),
    withMethods((store) => ({
        addEntry(name: string, calories: number): Observable<CalorieRecord> {
            return store._foodSql
                .addEntry(name, calories)
                .pipe(tap(() => store._reloadEntries()));
        },
        removeEntry(id: string): Observable<void> {
            return store._foodSql.removeEntry(id).pipe(tap(() => store._reloadEntries()));
        },
    })),
);
