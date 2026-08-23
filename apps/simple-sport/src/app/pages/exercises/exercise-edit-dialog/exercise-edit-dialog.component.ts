import {Component, Inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {Exercise, ExerciseType, EXERCISE_TYPE} from '@simple-sport/shared';
import {TranslatePipe} from '../../../pipes/translate.pipe';

export type ExerciseEditResult =
    | {action: 'save'; name: string; type: ExerciseType}
    | {action: 'archive'}
    | {action: 'restore'};

export interface ExerciseEditDialogData {
    exercise?: Exercise;
    nameTaken: (name: string) => boolean;
}

@Component({
    standalone: true,
    imports: [
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        TranslatePipe,
    ],
    templateUrl: './exercise-edit-dialog.component.html',
    styleUrl: './exercise-edit-dialog.component.css',
})
export class ExerciseEditDialogComponent {
    readonly types = [
        {value: EXERCISE_TYPE.Strength, labelKey: 'APP.PAGES.EXERCISES.STRENGTH'},
        {value: EXERCISE_TYPE.Cardio, labelKey: 'APP.PAGES.EXERCISES.CARDIO'},
    ];

    readonly name = signal('');
    readonly type = signal<ExerciseType>(EXERCISE_TYPE.Strength);
    readonly nameError = signal(false);
    readonly isNew: boolean;
    readonly isArchived: boolean;
    private readonly nameTaken: (name: string) => boolean;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: ExerciseEditDialogData,
        private readonly dialogRef: MatDialogRef<
            ExerciseEditDialogComponent,
            ExerciseEditResult
        >,
    ) {
        this.name.set(data.exercise?.name ?? '');
        this.type.set(data.exercise?.type ?? EXERCISE_TYPE.Strength);
        this.isNew = !data.exercise;
        this.isArchived = data.exercise?.archived === true;
        this.nameTaken = data.nameTaken;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const name = this.name().trim();

        if (!name) {
            return;
        }

        if (this.nameTaken(name)) {
            this.nameError.set(true);
            return;
        }

        this.dialogRef.close({action: 'save', name, type: this.type()});
    }

    archive(): void {
        this.dialogRef.close({action: 'archive'});
    }

    restore(): void {
        this.dialogRef.close({action: 'restore'});
    }
}
