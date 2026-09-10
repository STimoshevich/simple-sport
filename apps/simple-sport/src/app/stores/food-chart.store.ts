import {computed, inject} from '@angular/core';
import {signalStore, withMethods, withProps} from '@ngrx/signals';
import {withRxResourceState} from '@simple-sport/shared';
import {of} from 'rxjs';
import {FoodSqlService} from '@simple-sport/integration';
import {daysBetween} from '../utils/date-range';

const defaultStart = new Date(Date.now() - 19 * 24 * 60 * 60 * 1000);
const defaultEnd = new Date();

export const FoodChartStore = signalStore(
    withProps(() => ({
        _foodSql: inject(FoodSqlService),
    })),
    withRxResourceState({
        name: 'range',
        eager: true,
        loader: () => of({start: defaultStart, end: defaultEnd}),
    }),
    withRxResourceState({
        name: 'series',
        eager: true,
        requestValue: (store) => {
            const range = store._range();
            return range ? daysBetween(range.start, range.end) : 20;
        },
        loader: ({request, store}) => store._foodSql.getDailySeries(request ?? 20),
    }),
    withProps((store) => ({
        series: store._series,
        rangeStart: computed(() => store._range()?.start ?? defaultStart),
        rangeEnd: computed(() => store._range()?.end ?? defaultEnd),
    })),
    withMethods((store) => ({
        setRange(start: Date, end: Date): void {
            store._updateRange(() => ({start, end}));
        },
    })),
);
