import {Guid} from './guid';

export type ExerciseType = 'strength' | 'cardio' | 'stretching';

export const EXERCISE_TYPE = {
    Strength: 'strength',
    Cardio: 'cardio',
    Stretching: 'stretching',
} as const satisfies Record<string, ExerciseType>;

export interface Exercise {
    id: Guid;
    name: string;
    type: ExerciseType;
    comment?: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ExerciseWithUsage extends Exercise {
    usageCount: number;
    lastUsedAt?: string;
}

export interface ExerciseSaveInput {
    id?: Guid;
    name: string;
    type: ExerciseType;
    comment?: string;
}

export interface ExerciseQuery {
    search?: string;
    types?: ExerciseType[];
    includeArchived?: boolean;
    withUsage?: boolean;
}
