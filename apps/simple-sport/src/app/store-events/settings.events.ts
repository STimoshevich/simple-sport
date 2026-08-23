import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты SettingsStore (apps/simple-sport/src/app/stores/settings.store.ts)
export const settingsStoreEvents = eventGroup({
    source: 'Settings Store',
    events: {
        settingsLoaded: type<void>(),
    },
});
