import {type} from '@ngrx/signals';
import {eventGroup} from '@ngrx/signals/events';

// Ивенты WorkoutDetailStore (apps/simple-sport/src/app/stores/workout-detail.store.ts)
export const workoutDetailStoreEvents = eventGroup({
    source: 'Workout Detail Store',
    events: {
        workoutOpened: type<{trainingId: string}>(),
    },
});
