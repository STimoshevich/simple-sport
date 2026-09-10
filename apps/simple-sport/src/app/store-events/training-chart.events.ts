import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты TrainingChartStore (apps/simple-sport/src/app/stores/training-chart.store.ts)
export const trainingChartStoreEvents = eventGroup({
    source: 'Training Chart Store',
    events: {
        rangeChanged: type<{start: Date; end: Date}>(),
    },
});
