import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatBottomSheet} from '@angular/material/bottom-sheet';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDatepicker, MatDatepickerModule} from '@angular/material/datepicker';
import {
    MAT_DIALOG_DATA,
    MatDialog,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {
    MatSnackBar,
    MatSnackBarModule,
    MatSnackBarRef,
} from '@angular/material/snack-bar';
import {RouterLink} from '@angular/router';
import {
    APP_PATHS,
    cardioPaceMinutes,
    cardioSpeed,
    DistanceUnit,
    EXERCISE_TYPE,
    Exercise,
    ExerciseCheckState,
    ExerciseType,
    exerciseCheckState,
    formatDuration,
    formatPace,
    parseDurationInput,
    SetMetricField,
    sanitizeSetMetric,
    setProgress,
    todayLocal,
    toCanonicalDistance,
    toDateOrUndefined,
    toLocalDayKey,
    visibleSetFields,
} from '@simple-sport/shared';
import {ConfirmDeleteTrainingDialogComponent} from '../../guards/delete-training-dialog/delete-training-dialog.component';
import {
    ConfirmLeaveDialogComponent,
    ConfirmLeaveResult,
} from '../../guards/unsaved-workout-dialog/unsaved-workout-dialog.component';
import {CustomListSelectComponent} from '../../components/custom-list-select/custom-list-select.component';
import {
    CustomListSelectSheetComponent,
    isCreateSelectResult,
} from '../../components/custom-list-select-sheet/custom-list-select-sheet.component';
import {NoteFieldComponent} from '../../components/note-field/note-field.component';
import {
    TrainingExerciseView,
    TrainingSetView,
} from '@simple-sport/integration';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {TranslateService} from '../../services/translate.service';
import {SwipeDeleteDirective} from './swipe-delete.directive';
import {WorkoutEditorStore} from '../../stores/workout-detail.store';

export type WorkoutEditorDialogData = {
    trainingId?: string;
    date?: string;
};

type CreateDraft = {
    name: string;
    type: ExerciseType;
    comment: string;
    targetId?: string;
};

@Component({
    standalone: true,
    selector: 'app-workout-editor-dialog',
    imports: [
        TranslatePipe,
        CommonModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDialogModule,
        MatDatepickerModule,
        MatIconModule,
        MatSelectModule,
        MatCheckboxModule,
        MatSnackBarModule,
        RouterLink,
        CustomListSelectComponent,
        NoteFieldComponent,
        CdkDropList,
        CdkDrag,
        CdkDragHandle,
        SwipeDeleteDirective,
    ],
    templateUrl: './workout-detail.page.html',
    styleUrls: ['./workout-detail.page.css'],
    providers: [WorkoutEditorStore],
    host: {class: 'workout-editor'},
})
export class WorkoutEditorDialogComponent {
    readonly paths = APP_PATHS;
    readonly store = inject(WorkoutEditorStore);
    readonly dateModel = computed(
        () => toDateOrUndefined(this.store.date()) ?? new Date(),
    );
    private readonly dialogRef = inject(MatDialogRef<WorkoutEditorDialogComponent>);
    private readonly dialog = inject(MatDialog);
    private readonly bottomSheet = inject(MatBottomSheet);
    private readonly translate = inject(TranslateService);
    private readonly snackBar = inject(MatSnackBar);
    private snackRef?: MatSnackBarRef<unknown>;
    readonly displayName = (value: string): string => value;
    readonly types = [
        {value: EXERCISE_TYPE.Strength, labelKey: 'APP.PAGES.EXERCISES.STRENGTH'},
        {value: EXERCISE_TYPE.Cardio, labelKey: 'APP.PAGES.EXERCISES.CARDIO'},
        {value: EXERCISE_TYPE.Stretching, labelKey: 'APP.PAGES.EXERCISES.STRETCHING'},
    ];
    readonly createLabel = (query: string): string =>
        `${this.translate.translate('APP.PAGES.WORKOUT_DETAIL.CREATE')} «${query}»`;

    readonly draft = signal<CreateDraft | null>(null);
    readonly createError = signal<'exists' | 'archived' | null>(null);
    readonly archivedMatch = signal<Exercise | null>(null);
    private readonly durationDraft = signal<ReadonlyMap<string, string>>(new Map());
    private readonly noteOpen = signal<Record<string, boolean>>({});

    get hasUnsavedChanges(): boolean {
        return this.store.hasUnsavedChanges();
    }

    constructor() {
        const data =
            inject<WorkoutEditorDialogData>(MAT_DIALOG_DATA, {optional: true}) ?? {};
        const date = data.date || todayLocal();
        this.store.setDate(date);

        if (data.trainingId) {
            this.store.open(data.trainingId, date);
        }
    }

    typeLabel(type?: string): string {
        if (type === EXERCISE_TYPE.Cardio) {
            return 'APP.PAGES.EXERCISES.CARDIO';
        }

        if (type === EXERCISE_TYPE.Stretching) {
            return 'APP.PAGES.EXERCISES.STRETCHING';
        }

        return 'APP.PAGES.EXERCISES.STRENGTH';
    }

    catalogHint(workout: TrainingExerciseView): string {
        return this.store.catalogComment(workout.exerciseId);
    }

    isNoteOpen(workout: TrainingExerciseView): boolean {
        const override = this.noteOpen()[workout.id];

        if (override !== undefined) {
            return override;
        }

        return !!(workout.comment?.trim() || this.catalogHint(workout));
    }

    toggleNote(workout: TrainingExerciseView): void {
        this.noteOpen.update((state) => ({
            ...state,
            [workout.id]: !this.isNoteOpen(workout),
        }));
    }

    metricFields(workout: TrainingExerciseView, set: TrainingSetView): SetMetricField[] {
        return visibleSetFields(workout.type, set);
    }

    metricValue(set: TrainingSetView, field: SetMetricField): number | undefined {
        if (field === 'weight') {
            return set.weight;
        }

        if (field === 'reps') {
            return set.reps;
        }

        if (field === 'distance') {
            return set.distance;
        }

        return set.duration;
    }

    plannedPlaceholder(set: TrainingSetView, field: SetMetricField): string {
        if (field === 'duration') {
            return formatDuration(set.plannedDuration);
        }

        const value =
            field === 'weight'
                ? set.plannedWeight
                : field === 'reps'
                  ? set.plannedReps
                  : set.plannedDistance;
        return value === undefined || value === null ? '' : String(value);
    }

    onMetricInput(
        workout: TrainingExerciseView,
        set: TrainingSetView,
        field: SetMetricField,
        value: number | string | null,
        input?: HTMLInputElement,
    ): void {
        const result = sanitizeSetMetric(field, value);

        if (result.kind === 'reject') {
            if (input) {
                const current = this.metricValue(set, field);
                input.value =
                    current === undefined || current === null ? '' : String(current);
            }

            return;
        }

        const parsed = result.kind === 'empty' ? undefined : result.value;

        if (input && result.kind === 'value' && String(input.value) !== String(parsed)) {
            input.value = String(parsed);
        }

        const patch =
            field === 'weight'
                ? {weight: parsed}
                : field === 'reps'
                  ? {reps: parsed}
                  : field === 'distance'
                    ? {distance: parsed}
                    : {duration: parsed};
        this.store.onSetChange(workout.id, set.id, patch);
        this.store.autoCompleteSet(workout.id, set.id);
    }

    metricLabelKey(field: SetMetricField): string {
        if (field === 'weight') {
            return 'APP.PAGES.WORKOUT_DETAIL.WEIGHT';
        }

        if (field === 'reps') {
            return 'APP.PAGES.WORKOUT_DETAIL.REPS';
        }

        if (field === 'distance') {
            return 'APP.PAGES.WORKOUT_DETAIL.DISTANCE';
        }

        return 'APP.PAGES.WORKOUT_DETAIL.DURATION';
    }

    metricUnitKey(field: SetMetricField): string | null {
        if (field === 'weight') {
            return this.store.weightUnitKey();
        }

        if (field === 'distance') {
            return this.store.distanceUnitKey();
        }

        return null;
    }

    durationText(set: TrainingSetView): string {
        const draft = this.durationDraft().get(set.id);

        if (draft !== undefined) {
            return draft;
        }

        return formatDuration(set.duration);
    }

    onDurationInput(
        workout: TrainingExerciseView,
        set: TrainingSetView,
        text: string,
    ): void {
        this.setDurationDraft(set.id, text);

        if (text.trim() === '') {
            this.store.onSetChange(workout.id, set.id, {duration: undefined});
            return;
        }

        const parsed = parseDurationInput(text);

        if (parsed === undefined) {
            this.store.markDirty();
            return;
        }

        this.store.onSetChange(workout.id, set.id, {duration: parsed});
        this.store.autoCompleteSet(workout.id, set.id);
    }

    onDurationBlur(workout: TrainingExerciseView, set: TrainingSetView): void {
        const draft = this.durationDraft().get(set.id);
        this.removeDurationDraft(set.id);

        if (draft === undefined) {
            return;
        }

        if (draft.trim() === '') {
            this.store.onSetChange(workout.id, set.id, {duration: undefined});
            return;
        }

        const parsed = parseDurationInput(draft, {allowBareMinutes: true});

        if (parsed !== undefined) {
            this.store.onSetChange(workout.id, set.id, {duration: parsed});
            this.store.autoCompleteSet(workout.id, set.id);
        }
    }

    derivedCardio(set: TrainingSetView): {speed: string; pace: string} | null {
        const units = this.store.units();
        const meters = toCanonicalDistance(set.distance, units.distance);

        if (meters === undefined || !set.duration) {
            return null;
        }

        const speed = cardioSpeed(meters, set.duration, units.distance);
        const pace = cardioPaceMinutes(meters, set.duration, units.distance);

        if (speed === undefined || pace === undefined) {
            return null;
        }

        const locale = this.translate.getCurrentLanguage() === 'ru' ? 'ru-RU' : 'en-US';
        const speedText = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).format(speed);
        return {
            speed: `${speedText} ${this.translate.translate(this.speedUnitKey(units.distance))}`,
            pace: `${formatPace(pace)} ${this.translate.translate(this.paceUnitKey(units.distance))}`,
        };
    }

    checkState(workout: TrainingExerciseView): ExerciseCheckState {
        const {doneSets, totalSets} = setProgress(workout.sets ?? []);
        return exerciseCheckState(doneSets, totalSets);
    }

    setCount(workout: TrainingExerciseView): string {
        const {doneSets, totalSets} = setProgress(workout.sets ?? []);

        if (!totalSets) {
            return '';
        }

        return `${doneSets}/${totalSets}`;
    }

    private speedUnitKey(unit: DistanceUnit): string {
        return unit === 'mi'
            ? 'APP.PAGES.WORKOUT_DETAIL.SPEED_MPH'
            : 'APP.PAGES.WORKOUT_DETAIL.SPEED_KMH';
    }

    private paceUnitKey(unit: DistanceUnit): string {
        return unit === 'mi'
            ? 'APP.PAGES.WORKOUT_DETAIL.PACE_PER_MI'
            : 'APP.PAGES.WORKOUT_DETAIL.PACE_PER_KM';
    }

    onDatePicked(value: Date | null, picker?: MatDatepicker<Date>): void {
        picker?.close();
        const date = toDateOrUndefined(value);

        if (!date) {
            return;
        }

        this.store.setDate(toLocalDayKey(date));
    }

    openPicker(picker: MatDatepicker<Date>): void {
        picker.open();
    }

    createFromTemplate(): void {
        return;
    }

    createEmpty(): void {
        this.store.createEmpty().subscribe();
    }

    createFromExercises(): void {
        this.openExerciseSheet(true);
    }

    addExercises(): void {
        this.openExerciseSheet(false);
    }

    startCreate(name: string, targetId?: string): void {
        this.createError.set(null);
        this.archivedMatch.set(null);
        this.draft.set({
            name: name.trim(),
            type: EXERCISE_TYPE.Strength,
            comment: '',
            targetId,
        });
    }

    cancelCreate(): void {
        this.draft.set(null);
        this.createError.set(null);
        this.archivedMatch.set(null);
    }

    confirmCreate(): void {
        const draft = this.draft();

        if (!draft) {
            return;
        }

        const name = draft.name.trim();

        if (!name) {
            return;
        }

        const existing = this.store.findExerciseByName(name);

        if (existing && !existing.archived) {
            this.createError.set('exists');
            this.archivedMatch.set(null);
            return;
        }

        if (existing?.archived) {
            this.createError.set('archived');
            this.archivedMatch.set(existing);
            return;
        }

        this.store.createExerciseAndAdd(draft, draft.targetId).subscribe({
            next: () => this.cancelCreate(),
        });
    }

    restoreArchived(): void {
        const existing = this.archivedMatch();
        const draft = this.draft();

        if (!existing) {
            return;
        }

        this.store.restoreAndAdd(existing, draft?.targetId).subscribe({
            next: () => this.cancelCreate(),
        });
    }

    onExerciseSelected(workoutId: string, selected: string[]): void {
        this.store.onExerciseSelected(workoutId, selected);
    }

    addSet(workout: TrainingExerciseView): void {
        this.store.addSet(workout.id).subscribe();
    }

    onSetCheck(event: Event, workout: TrainingExerciseView, set: TrainingSetView): void {
        event.preventDefault();
        event.stopPropagation();
        this.store.toggleSetDone(workout.id, set.id);
    }

    onExerciseCheck(event: Event, workout: TrainingExerciseView): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.checkState(workout) === 'empty') {
            return;
        }

        this.store.toggleExerciseDone(workout.id);
    }

    onSetDrop(
        event: CdkDragDrop<TrainingSetView[]>,
        workout: TrainingExerciseView,
    ): void {
        this.store.reorderSets(workout.id, event.previousIndex, event.currentIndex);
    }

    removeSet(workout: TrainingExerciseView, set: TrainingSetView): void {
        const index = (workout.sets ?? []).findIndex((item) => item.id === set.id);
        const removed = this.store.removeSet(workout.id, set.id);

        if (!removed || index < 0) {
            return;
        }

        this.removeDurationDraft(set.id);
        this.openUndoToast('APP.PAGES.WORKOUT_DETAIL.SET_DELETED', () =>
            this.store.insertSet(workout.id, removed, index),
        );
    }

    removeExercise(workout: TrainingExerciseView): void {
        const index = this.store.workouts().findIndex((item) => item.id === workout.id);
        const removed = this.store.removeExercise(workout.id);

        if (!removed || index < 0) {
            return;
        }

        for (const set of removed.sets ?? []) {
            this.removeDurationDraft(set.id);
        }

        this.openUndoToast('APP.PAGES.WORKOUT_DETAIL.EXERCISE_DELETED', () =>
            this.store.insertExercise(removed, index),
        );
    }

    confirmDeleteTraining(): void {
        if (!this.store.trainingId()) {
            return;
        }

        this.dialog
            .open(ConfirmDeleteTrainingDialogComponent, {disableClose: true})
            .afterClosed()
            .subscribe((confirmed?: boolean) => {
                if (!confirmed) {
                    return;
                }

                this.store.deleteTraining().subscribe({
                    next: () => this.dialogRef.close(true),
                    error: () =>
                        this.snackBar.open(
                            this.translate.translate(
                                'APP.PAGES.WORKOUT_DETAIL.DELETE_ERROR',
                            ),
                            undefined,
                            {
                                duration: 4000,
                            },
                        ),
                });
            });
    }

    save(): void {
        this.persistAndClose();
    }

    cancel(): void {
        this.tryClose();
    }

    tryClose(): void {
        if (!this.draft() && !this.store.hasUnsavedChanges()) {
            this.dialogRef.close(false);
            return;
        }

        this.dialog
            .open(ConfirmLeaveDialogComponent, {disableClose: true})
            .afterClosed()
            .subscribe((result?: ConfirmLeaveResult) => {
                if (result === 'discard') {
                    this.dialogRef.close(false);
                }

                if (result === 'save') {
                    this.persistAndClose();
                }
            });
    }

    private persistAndClose(): void {
        this.store.save().subscribe({
            next: () => this.dialogRef.close(true),
            error: (err: {code?: string} | undefined) => {
                if (err?.code === 'invalid') {
                    return;
                }

                this.snackBar.open(
                    this.translate.translate('APP.PAGES.WORKOUT_DETAIL.SAVE_ERROR'),
                    undefined,
                    {
                        duration: 4000,
                    },
                );
            },
        });
    }

    private setDurationDraft(setId: string, text: string): void {
        this.durationDraft.update((drafts) => new Map(drafts).set(setId, text));
    }

    private removeDurationDraft(setId: string): void {
        this.durationDraft.update((drafts) => {
            if (!drafts.has(setId)) {
                return drafts;
            }

            const next = new Map(drafts);
            next.delete(setId);
            return next;
        });
    }

    private openUndoToast(messageKey: string, undo: () => void): void {
        const previous = this.snackRef;
        this.snackRef = undefined;
        previous?.dismiss();
        const ref = this.snackBar.open(
            this.translate.translate(messageKey),
            this.translate.translate('APP.PAGES.HISTORY.UNDO'),
            {duration: 5000},
        );
        this.snackRef = ref;
        ref.afterDismissed().subscribe((info) => {
            if (this.snackRef !== ref) {
                return;
            }

            this.snackRef = undefined;

            if (!info.dismissedByAction) {
                return;
            }

            undo();
        });
    }

    private openExerciseSheet(creatingWorkout: boolean): void {
        this.bottomSheet
            .open(CustomListSelectSheetComponent<string>, {
                data: {
                    items: this.store.catalogNames(),
                    selected: [],
                    multiple: true,
                    displayWith: this.displayName,
                    title: this.translate.translate('APP.PAGES.WORKOUT_DETAIL.EXERCISE'),
                    searchable: true,
                    searchPlaceholder: this.translate.translate(
                        'APP.PAGES.WORKOUT_DETAIL.SEARCH',
                    ),
                    allowCreate: true,
                    createLabel: this.createLabel,
                },
            })
            .afterDismissed()
            .subscribe((value?: string[] | {create: string}) => {
                if (isCreateSelectResult(value)) {
                    this.startCreate(value.create);
                    return;
                }

                if (!value?.length) {
                    return;
                }

                if (creatingWorkout) {
                    this.store.createWithExercises(value).subscribe();
                } else {
                    this.store.addExercises(value).subscribe();
                }
            });
    }
}

/** @deprecated use WorkoutEditorDialogComponent */
export {WorkoutEditorDialogComponent as WorkoutDetailPageComponent};
