import { CanDeactivateFn } from '@angular/router';
import { WorkoutDetailPageComponent } from '../pages/workout-detail/workout-detail.page';

export const unsavedWorkoutGuard: CanDeactivateFn<WorkoutDetailPageComponent> = (component) => component.canLeave();
