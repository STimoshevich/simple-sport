import {Component} from '@angular/core';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TranslatePipe} from '../../pipes/translate.pipe';

@Component({
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, TranslatePipe],
    templateUrl: './delete-training-dialog.component.html',
})
export class ConfirmDeleteTrainingDialogComponent {
    constructor(
        private readonly dialogRef: MatDialogRef<
            ConfirmDeleteTrainingDialogComponent,
            boolean
        >,
    ) {}
    close(result: boolean): void {
        this.dialogRef.close(result);
    }
}
