import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты UnitsStore (apps/simple-sport/src/app/stores/units.store.ts)
export const unitsStoreEvents = eventGroup({
    source: 'Units Store',
    events: {
        unitsChanged: type<string>(),
    },
});
