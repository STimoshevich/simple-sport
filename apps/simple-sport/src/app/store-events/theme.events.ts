import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты ThemeStore (apps/simple-sport/src/app/stores/theme.store.ts)
export const themeStoreEvents = eventGroup({
    source: 'Theme Store',
    events: {
        themeChanged: type<string>(),
    },
});
