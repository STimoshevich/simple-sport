import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslatePipe],
  templateUrl: './unsaved-workout-dialog.component.html'
})
export class ConfirmLeaveDialogComponent {
  constructor(private readonly dialogRef: MatDialogRef<ConfirmLeaveDialogComponent>) {}
  close(result: boolean): void { this.dialogRef.close(result); }
}
