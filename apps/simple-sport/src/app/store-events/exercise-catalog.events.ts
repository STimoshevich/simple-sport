import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты ExerciseCatalogStore (apps/simple-sport/src/app/stores/global/exercise-catalog.store.ts)
export const exerciseCatalogStoreEvents = eventGroup({
    source: 'Exercise Catalog Store',
    events: {
        catalogLoaded: type<void>(),
    },
});
