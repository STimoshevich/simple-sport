import {Component} from '@angular/core';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TranslatePipe} from '../../pipes/translate.pipe';

export type ConfirmLeaveResult = 'save' | 'discard' | 'cancel';

@Component({
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, TranslatePipe],
    templateUrl: './unsaved-workout-dialog.component.html',
})
export class ConfirmLeaveDialogComponent {
    constructor(
        private readonly dialogRef: MatDialogRef<
            ConfirmLeaveDialogComponent,
            ConfirmLeaveResult
        >,
    ) {}
    close(result: ConfirmLeaveResult): void {
        this.dialogRef.close(result);
    }
}
