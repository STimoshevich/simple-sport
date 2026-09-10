import {ExerciseCheckState, ExerciseType} from '@simple-sport/shared';

export interface TrainingSetView {
    id: string;
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
    draft?: boolean;
}

/** @deprecated use TrainingSetView */
export type TrainingSetProgressView = TrainingSetView;

export interface TrainingExerciseView {
    id: string;
    name: string;
    type?: ExerciseType;
    reps?: number;
    weight?: number;
    plannedWeight?: number;
    plannedReps?: number;
    distance?: number;
    plannedDistance?: number;
    duration?: number;
    plannedDuration?: number;
    archived?: boolean;
    exerciseId?: string;
    trainingId?: string;
    date: string;
    trainingName?: string;
    trainingComment?: string;
    comment?: string;
    sets?: TrainingSetView[];
    doneSets?: number;
    totalSets?: number;
    checkState?: ExerciseCheckState;
    muted?: boolean;
}

/** @deprecated use TrainingExerciseView */
export type TrainingContract = TrainingExerciseView;
/** @deprecated use TrainingExerciseView */
export type TrainingContractRecord = TrainingExerciseView;

export interface TrainingSessionView {
    id: string;
    name: string;
    comment?: string;
    allDone: boolean;
    exercises: TrainingExerciseView[];
    muted?: boolean;
}
