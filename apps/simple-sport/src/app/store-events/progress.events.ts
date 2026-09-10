import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты ProgressStore (apps/simple-sport/src/app/stores/progress.store.ts)
export const progressStoreEvents = eventGroup({
    source: 'Progress Store',
    events: {
        seriesRefreshed: type<void>(),
    },
});
