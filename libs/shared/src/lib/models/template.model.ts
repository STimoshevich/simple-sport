import {ExerciseType} from './exercise.model';
import {Guid} from './guid';

export interface TemplateSet {
    id: Guid;
    templateExerciseId: Guid;
    sortOrder: number;
    plannedWeight?: number;
    plannedReps?: number;
    plannedDistance?: number;
    plannedDuration?: number;
}

export interface TemplateExerciseFull {
    id: Guid;
    templateId: Guid;
    exerciseId: Guid;
    exerciseName: string;
    exerciseType: ExerciseType;
    sortOrder: number;
    comment?: string;
    sets: TemplateSet[];
}

export interface TemplateFull {
    id: Guid;
    name: string;
    comment?: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
    exercises: TemplateExerciseFull[];
}

export interface TemplateSummary {
    id: Guid;
    name: string;
    comment?: string;
    archived: boolean;
    exerciseCount: number;
    lastUsedAt?: string;
}

export interface TemplateQuery {
    search?: string;
    includeArchived?: boolean;
}

export interface TemplateSetDraft {
    id?: Guid;
    sortOrder: number;
    plannedWeight?: number;
    plannedReps?: number;
    plannedDistance?: number;
    plannedDuration?: number;
}

export interface TemplateExerciseDraft {
    id?: Guid;
    exerciseId: Guid;
    sortOrder: number;
    comment?: string;
    sets: TemplateSetDraft[];
}

export interface TemplateSaveInput {
    id?: Guid;
    name: string;
    comment?: string;
    exercises: TemplateExerciseDraft[];
}

export type TemplateDeltaOp =
    | {kind: 'addExercise'; exercise: TemplateExerciseDraft}
    | {kind: 'removeExercise'; templateExerciseId: Guid}
    | {
          kind: 'updateExercise';
          templateExerciseId: Guid;
          comment?: string;
          sortOrder?: number;
      }
    | {kind: 'addSet'; templateExerciseId: Guid; set: TemplateSetDraft}
    | {kind: 'removeSet'; templateSetId: Guid}
    | {kind: 'updateSet'; templateSetId: Guid; set: TemplateSetDraft};

export interface TemplateDelta {
    operations: TemplateDeltaOp[];
}

export interface SyncTarget {
    trainingId: Guid;
    date: string;
    inProgress: boolean;
}

export interface SyncPreviewItem {
    trainingId: Guid;
    date: string;
    applicable: number;
    skipped: number;
    reason?: string;
}

export interface SyncPreview {
    items: SyncPreviewItem[];
}

export interface SyncOperationLog {
    id: Guid;
    templateId: Guid;
    trainingIds: Guid[];
    delta: TemplateDelta;
    appliedAt: string;
}
