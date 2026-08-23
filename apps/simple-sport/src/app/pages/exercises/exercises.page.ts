import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {APP_PATHS, Exercise} from '@simple-sport/shared';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {ExerciseCatalogStore} from '../../stores/global/exercise-catalog.store';
import {
    ExerciseEditDialogComponent,
    ExerciseEditResult,
} from './exercise-edit-dialog/exercise-edit-dialog.component';

@Component({
    standalone: true,
    selector: 'app-exercises-page',
    imports: [
        TranslatePipe,
        RouterLink,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
    ],
    templateUrl: './exercises.page.html',
    styleUrl: './exercises.page.css',
})
export class ExercisesPageComponent {
    readonly paths = APP_PATHS;
    readonly catalog = inject(ExerciseCatalogStore);
    readonly showArchived = signal(false);
    readonly exercises = computed(() => {
        const items = this.catalog.exercises();
        return this.showArchived() ? items : items.filter((item) => !item.archived);
    });
    readonly emptyKind = computed<'loading' | 'none' | 'filter' | null>(() => {
        if (!this.catalog.hasLoaded()) {
            return 'loading';
        }

        if (this.exercises().length) {
            return null;
        }

        return this.catalog.exercises().length ? 'filter' : 'none';
    });
    private readonly dialog = inject(MatDialog);

    openCreate(): void {
        this.openDialog();
    }

    openEdit(exercise: Exercise): void {
        this.openDialog(exercise);
    }

    onShowArchived(checked: boolean): void {
        this.showArchived.set(checked);
    }

    private openDialog(exercise?: Exercise): void {
        this.dialog
            .open(ExerciseEditDialogComponent, {
                data: {
                    exercise,
                    nameTaken: (name: string) =>
                        this.catalog.nameTaken(name, exercise?.id),
                },
            })
            .afterClosed()
            .subscribe((result?: ExerciseEditResult) => {
                if (!result) {
                    return;
                }

                if (result.action === 'save') {
                    this.catalog
                        .save({id: exercise?.id, name: result.name, type: result.type})
                        .subscribe();
                    return;
                }

                if (!exercise) {
                    return;
                }

                if (result.action === 'archive') {
                    this.catalog.archive(exercise.id).subscribe();
                    return;
                }

                this.catalog.restore(exercise.id).subscribe();
            });
    }
}
