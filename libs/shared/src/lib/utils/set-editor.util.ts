import {
    SetMetricField,
    SetMetricValues,
    filledSetFields,
    isPresentMetric,
} from './set-metrics.util';

export function copySetValues(set: SetMetricValues): SetMetricValues {
    return {
        weight: set.weight,
        reps: set.reps,
        distance: set.distance,
        duration: set.duration,
        plannedWeight: set.plannedWeight,
        plannedReps: set.plannedReps,
        plannedDistance: set.plannedDistance,
        plannedDuration: set.plannedDuration,
    };
}

export function hasCopyableValues(set: SetMetricValues): boolean {
    return filledSetFields(set).length > 0;
}

export function isPersistableSet(set: SetMetricValues & {done?: boolean}): boolean {
    return set.done === true || hasCopyableValues(set);
}

export function fillFactFromPlan<T extends SetMetricValues>(set: T): T {
    return {
        ...set,
        weight: isPresentMetric(set.weight) ? set.weight : set.plannedWeight,
        reps: isPresentMetric(set.reps) ? set.reps : set.plannedReps,
        distance: isPresentMetric(set.distance) ? set.distance : set.plannedDistance,
        duration: isPresentMetric(set.duration) ? set.duration : set.plannedDuration,
    };
}

export function withRenumberedSort<T extends {sortOrder: number}>(
    sets: readonly T[],
): T[] {
    return sets.map((set, index) =>
        set.sortOrder === index ? set : {...set, sortOrder: index},
    );
}

export type SanitizeMetricResult =
    | {kind: 'empty'}
    | {kind: 'reject'}
    | {kind: 'value'; value: number};

export function sanitizeSetMetric(
    field: SetMetricField,
    raw: number | string | null | undefined,
): SanitizeMetricResult {
    if (raw === null || raw === undefined || raw === '') {
        return {kind: 'empty'};
    }

    const value = typeof raw === 'number' ? raw : Number(raw);

    if (!Number.isFinite(value) || value < 0) {
        return {kind: 'reject'};
    }

    return {kind: 'value', value: field === 'reps' ? Math.round(value) : value};
}

export function missingExerciseIds(
    exercises: readonly {id: string; name?: string; exerciseId?: string}[],
): string[] {
    return exercises
        .filter((item) => !item.exerciseId && !item.name?.trim())
        .map((item) => item.id);
}
