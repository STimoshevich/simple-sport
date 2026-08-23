import {ExerciseSaveInput, ExerciseType} from './exercise.model';
import {Guid} from './guid';

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
}

export interface TrainingSet {
    id: Guid;
    trainingExerciseId: Guid;
    sortOrder: number;
    weight?: number;
    reps?: number;
    distance?: number;
    duration?: number;
    plannedWeight?: number;
    plannedReps?: number;
    plannedDistance?: number;
    plannedDuration?: number;
    done: boolean;
    doneAt?: string;
    sourceTemplateSetId?: Guid;
}

export interface TrainingExerciseFull {
    id: Guid;
    trainingId: Guid;
    exerciseId: Guid;
    exerciseName: string;
    exerciseType: ExerciseType;
    exerciseArchived: boolean;
    sortOrder: number;
    comment?: string;
    sourceTemplateExerciseId?: Guid;
    sets: TrainingSet[];
}

export interface DayNote {
    date: string;
    text: string;
    updatedAt: string;
}

export interface TrainingFull {
    id: Guid;
    date: string;
    name?: string;
    comment?: string;
    sortOrder: number;
    templateId?: Guid;
    templateArchived?: boolean;
    createdAt: string;
    updatedAt: string;
    // Только идентификаторы упражнений тренировки — вложенные модели больше не собираем
    exerciseIds: Guid[];
}

export interface TrainingSummary {
    id: Guid;
    date: string;
    name?: string;
    comment?: string;
    sortOrder: number;
    templateId?: Guid;
    exerciseCount: number;
}

export interface TrainingDay {
    date: string;
    note?: DayNote;
    trainings: TrainingFull[];
}

export type SortDirection = 'asc' | 'desc';

// Поля сортировки тренировок для TrainingQuery.orderBy
export type TrainingSortField =
    | 'date'
    | 'sortOrder'
    | 'name'
    | 'createdAt'
    | 'updatedAt'
    | 'exerciseCount';

export interface TrainingSort {
    field: TrainingSortField;
    direction: SortDirection;
}

// Fluent-цепочка в стиле orderBy.thenBy; сам является TrainingSort[]
export interface TrainingSortChain extends Array<TrainingSort> {
    thenBy(field: TrainingSortField, direction?: SortDirection): TrainingSortChain;
}

// Сортировка для TrainingQuery: первый критерий — ORDER BY, остальные — THEN BY.
//   orderBy: trainingOrderBy('date', 'desc').thenBy('sortOrder')
export function trainingOrderBy(
    field: TrainingSortField,
    direction: SortDirection = 'asc',
): TrainingSortChain {
    const sorts = [{field, direction}] as TrainingSortChain;

    sorts.thenBy = (
        nextField: TrainingSortField,
        nextDirection: SortDirection = 'asc',
    ) => {
        sorts.push({field: nextField, direction: nextDirection});
        return sorts;
    };

    return sorts;
}

export interface TrainingQuery {
    dateFrom?: string;
    dateTo?: string;
    trainingIds?: Guid[];
    templateId?: Guid;
    exerciseIds?: Guid[];
    exerciseTypes?: ExerciseType[];
    includeArchivedExercises?: boolean;
    onlyDoneSets?: boolean;
    includeEmptyDays?: boolean;
    page?: {offset: number; limit: number};
    orderBy?: TrainingSort[];
}

export interface TrainingSetDraft {
    id?: Guid;
    sortOrder: number;
    weight?: number;
    reps?: number;
    distance?: number;
    duration?: number;
    plannedWeight?: number;
    plannedReps?: number;
    plannedDistance?: number;
    plannedDuration?: number;
    done?: boolean;
    doneAt?: string;
    sourceTemplateSetId?: Guid;
}

export interface TrainingExerciseDraft {
    id?: Guid;
    exerciseId?: Guid;
    newExercise?: ExerciseSaveInput;
    sortOrder: number;
    comment?: string;
    sourceTemplateExerciseId?: Guid;
    sets: TrainingSetDraft[];
}

export interface TrainingSaveInput {
    id?: Guid;
    date: string;
    name?: string;
    comment?: string;
    sortOrder?: number;
    templateId?: Guid;
    exercises: TrainingExerciseDraft[];
}

export interface SetsDoneInput {
    setIds: Guid[];
    done: boolean;
    fillFactFromPlan: boolean;
    origin?: string;
}

export interface TrainingSetSnapshot {
    id: Guid;
    done: boolean;
    doneAt?: string;
    weight?: number;
    reps?: number;
    distance?: number;
    duration?: number;
}
