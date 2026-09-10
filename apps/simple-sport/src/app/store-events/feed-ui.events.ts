import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

import {HistoryFiltersState} from '@simple-sport/integration';

// Ивенты FeedUiStore (apps/simple-sport/src/app/stores/feed-ui.store.ts)
export const feedUiStoreEvents = eventGroup({
    source: 'Feed UI Store',
    events: {
        filtersChanged: type<HistoryFiltersState>(),
    },
});
