import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs/operators';
import { WorkoutDetailPageComponent } from '../pages/workout-detail/workout-detail.page';
import { ConfirmLeaveDialogComponent } from './unsaved-workout-dialog.component';

export const unsavedWorkoutGuard: CanDeactivateFn<WorkoutDetailPageComponent> = (component) => {
  if (!component.hasUnsavedChanges) return true;
  const dialog = inject(MatDialog);
  return dialog.open(ConfirmLeaveDialogComponent).afterClosed().pipe(map((result) => !!result));
};
