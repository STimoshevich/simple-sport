import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'APP.PAGES.WORKOUT_DETAIL.UNSAVED_TITLE' | translate }}</h2>
    <mat-dialog-content>{{ 'APP.PAGES.WORKOUT_DETAIL.UNSAVED_CONFIRM' | translate }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close(false)">{{ 'APP.PAGES.WORKOUT_DETAIL.CANCEL' | translate }}</button>
      <button mat-flat-button color="warn" (click)="close(true)">{{ 'APP.PAGES.WORKOUT_DETAIL.LEAVE' | translate }}</button>
    </mat-dialog-actions>
  `
})
export class ConfirmLeaveDialogComponent {
  constructor(private readonly dialogRef: MatDialogRef<ConfirmLeaveDialogComponent>) {}
  close(result: boolean): void { this.dialogRef.close(result); }
}
