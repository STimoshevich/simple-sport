import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты HistoryStore (apps/simple-sport/src/app/stores/history.store.ts).
// Тип ивента автоматически собирается как '[History Store] trainingsReordered'.
// Использование:
//   dispatch: injectDispatcher(historyStoreEvents).trainingsReordered({ date, orderedIds });
//   слушатель: withEventHandlers((store, events = inject(Events)) => ({
//     onReordered: events.on(historyStoreEvents.trainingsReordered, ({ payload }) => ...)
//   }))
export const historyStoreEvents = eventGroup({
    source: 'History Store',
    events: {
        trainingsReordered: type<{date: string; orderedIds: string[]}>(),
    },
});
