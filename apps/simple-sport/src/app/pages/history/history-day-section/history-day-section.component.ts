import {
    CdkDrag,
    CdkDragDrop,
    CdkDragHandle,
    CdkDropList,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
import {DatePipe} from '@angular/common';
import {Component, computed, inject, input, output} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {
    sessionDisplayName,
    toDateOrUndefined,
    todayLocal,
    TrainingSummary,
} from '@simple-sport/shared';
import {DayNoteComponent} from '../../../components/day-note/day-note.component';
import {TrainingExerciseView, TrainingSessionView} from '@simple-sport/integration';
import {TranslatePipe} from '../../../pipes/translate.pipe';
import {TranslateService} from '../../../services/translate.service';

interface TrainingDayView {
    groupId: string;
    note?: string;
    isToday: boolean;
    isFuture: boolean;
    trainings: TrainingSessionView[];
    muted?: boolean;
}

@Component({
    standalone: true,
    selector: 'app-history-day-section',
    imports: [
        TranslatePipe,
        DatePipe,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        CdkDropList,
        CdkDrag,
        CdkDragHandle,
        DayNoteComponent,
    ],
    templateUrl: './history-day-section.component.html',
    styleUrls: ['./history-day-section.component.css'],
})
export class HistoryDaySectionComponent {
    readonly day = input.required<string>();
    readonly dayItems = input<readonly TrainingSummary[]>([]);

    readonly view = computed(() => this.toDayView(this.day(), this.dayItems()));

    readonly noteSaved = output<string>();
    readonly trainingAdded = output();
    readonly workoutOpened = output<string>();
    readonly trainingsReordered = output<string[]>();
    readonly exerciseToggled = output<TrainingExerciseView>();

    private readonly translate = inject(TranslateService);

    toDate(dayKey: string): Date {
        return toDateOrUndefined(dayKey) ?? new Date();
    }

    sessionTitle(session: TrainingSessionView): string {
        return sessionDisplayName(
            session.name,
            session.exercises.map((exercise) => exercise.name),
            this.translate.translate('APP.PAGES.HISTORY.WORKOUT'),
            this.translate.translate('APP.PAGES.HISTORY.AND_MORE'),
            this.translate.translate('APP.PAGES.HISTORY.MORE_SUFFIX'),
        );
    }

    onExerciseClick(event: Event, exercise: TrainingExerciseView): void {
        event.preventDefault();
        event.stopPropagation();

        if (exercise.checkState === 'empty') {
            return;
        }

        this.exerciseToggled.emit(exercise);
    }

    onTrainingDrop(event: CdkDragDrop<TrainingSessionView[]>): void {
        if (event.previousIndex === event.currentIndex) {
            return;
        }

        const orderedIds = event.container.data.map((session) => session.id);
        moveItemInArray(orderedIds, event.previousIndex, event.currentIndex);
        this.trainingsReordered.emit(orderedIds);
    }

    private toDayView(
        date: string,
        trainings: readonly TrainingSummary[],
    ): TrainingDayView {
        const today = todayLocal();

        return {
            groupId: date,
            isToday: date === today,
            isFuture: date > today,
            trainings: trainings.map((training) => ({
                id: training.id,
                name: training.name ?? '',
                comment: training.comment,
                allDone: false,
                exercises: [],
            })),
        };
    }
}
