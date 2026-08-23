import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты FoodChartStore (apps/simple-sport/src/app/stores/food-chart.store.ts)
export const foodChartStoreEvents = eventGroup({
    source: 'Food Chart Store',
    events: {
        rangeChanged: type<{start: Date; end: Date}>(),
    },
});
