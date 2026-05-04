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
  templateUrl: './settings-select-dialog.component.html'
})
export class SettingsSelectDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: SettingsDialogData,
    private readonly dialogRef: MatDialogRef<SettingsSelectDialogComponent>
  ) {}

  select(value: string): void { this.dialogRef.close(value); }
}
