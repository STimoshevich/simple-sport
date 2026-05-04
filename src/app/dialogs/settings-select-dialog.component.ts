import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

interface SettingsDialogData {
  title: string;
  options: { value: string; label: string }[];
}

@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-actions align="start">
      <button mat-stroked-button *ngFor="let option of data.options" (click)="select(option.value)">{{ option.label }}</button>
    </mat-dialog-actions>
  `
})
export class SettingsSelectDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: SettingsDialogData,
    private readonly dialogRef: MatDialogRef<SettingsSelectDialogComponent>
  ) {}

  select(value: string): void { this.dialogRef.close(value); }
}
