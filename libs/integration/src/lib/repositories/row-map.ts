import {Exercise, ExerciseType, ExerciseWithUsage} from '@simple-sport/shared';
import {SqliteRow} from '../sqlite-storage.service';
import {
    asBool,
    asExerciseType,
    asNumber,
    asOptionalString,
    asString,
    cell,
} from '../sqlite.util';

export function mapExercise(row: SqliteRow): Exercise {
    return {
        id: asString(cell(row, 'id')),
        name: asString(cell(row, 'name')),
        type: asExerciseType(cell(row, 'type')),
        comment: asOptionalString(cell(row, 'comment')),
        archived: asBool(cell(row, 'archived')),
        createdAt: asString(cell(row, 'created_at')),
        updatedAt: asString(cell(row, 'updated_at')),
    };
}

export function mapExerciseWithUsage(row: SqliteRow): ExerciseWithUsage {
    return {
        ...mapExercise(row),
        usageCount: asNumber(cell(row, 'usage_count'), 0),
        lastUsedAt: asOptionalString(cell(row, 'last_used_at')),
    };
}

export function mapType(value: unknown): ExerciseType {
    return asExerciseType(value);
}
