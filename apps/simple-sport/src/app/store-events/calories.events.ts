import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

import {CalorieRecord} from '@simple-sport/integration';

// Ивенты CaloriesStore (apps/simple-sport/src/app/stores/calories.store.ts)
export const caloriesStoreEvents = eventGroup({
    source: 'Calories Store',
    events: {
        entryAdded: type<CalorieRecord>(),
    },
});
