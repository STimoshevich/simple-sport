import {computed, inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {signalStore, withMethods, withProps} from '@ngrx/signals';
import {APP_ROUTE_PARAMS, withRxResourceState} from '@simple-sport/shared';
import {of} from 'rxjs';
import {TrainingSqlService} from '@simple-sport/integration';
import {daysBetween} from '../utils/date-range';

const defaultStart = new Date(Date.now() - 19 * 24 * 60 * 60 * 1000);
const defaultEnd = new Date();

export const TrainingChartStore = signalStore(
    withProps(() => ({
        _route: inject(ActivatedRoute),
        _trainingSql: inject(TrainingSqlService),
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
            return {
                name:
                    store._route.snapshot.paramMap.get(APP_ROUTE_PARAMS.TRAINING_NAME) ??
                    '',
                days: range ? daysBetween(range.start, range.end) : 20,
            };
        },
        requestEqual: (left, right) =>
            left?.name === right?.name && left?.days === right?.days,
        loader: ({request, store}) =>
            store._trainingSql.getProgressSeriesByName(
                request?.name ?? '',
                request?.days ?? 20,
            ),
    }),
    withProps((store) => ({
        trainingName:
            store._route.snapshot.paramMap.get(APP_ROUTE_PARAMS.TRAINING_NAME) ?? '',
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
