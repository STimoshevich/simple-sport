import {ExerciseWithUsage} from '../models/exercise.model';
import {shiftDayKey, todayLocal} from './date.util';

export const EXERCISE_USAGE_DAYS = 90;

export function exerciseUsageSince(today = todayLocal()): string {
    return shiftDayKey(today, -(EXERCISE_USAGE_DAYS - 1));
}

export function rankExercisesForPicker(
    exercises: readonly ExerciseWithUsage[],
    query = '',
): ExerciseWithUsage[] {
    const needle = query.trim().toLowerCase();
    const filtered = exercises.filter((item) => {
        if (item.archived) {
            return false;
        }

        const name = item.name.trim();

        if (!name) {
            return false;
        }

        return !needle || name.toLowerCase().includes(needle);
    });

    return [...filtered].sort((left, right) => {
        const usage = (right.usageCount ?? 0) - (left.usageCount ?? 0);

        if (usage !== 0) {
            return usage;
        }

        return left.name.localeCompare(right.name, undefined, {sensitivity: 'base'});
    });
}

export function shouldOfferCreateExercise(
    exercises: readonly ExerciseWithUsage[],
    query: string,
): boolean {
    const needle = query.trim();
    return needle.length > 0 && rankExercisesForPicker(exercises, needle).length === 0;
}
