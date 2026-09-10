import {ExerciseType} from '../models/exercise.model';

export type FeedFilterMatchInput = {
    exerciseIds: string[];
    exerciseTypes: ExerciseType[];
    showArchived: boolean;
};

export type FeedFilterExercise = {
    exerciseId?: string;
    type?: ExerciseType;
    archived?: boolean;
};

export function hasVisualFeedFilter(filters: FeedFilterMatchInput): boolean {
    return (
        filters.exerciseIds.length > 0 ||
        filters.exerciseTypes.length > 0 ||
        !filters.showArchived
    );
}

export function exerciseMatchesFeedFilter(
    exercise: FeedFilterExercise,
    filters: FeedFilterMatchInput,
): boolean {
    if (exercise.archived && !filters.showArchived) {
        return false;
    }

    if (
        filters.exerciseTypes.length &&
        (!exercise.type || !filters.exerciseTypes.includes(exercise.type))
    ) {
        return false;
    }

    if (
        filters.exerciseIds.length &&
        (!exercise.exerciseId || !filters.exerciseIds.includes(exercise.exerciseId))
    ) {
        return false;
    }

    return true;
}

export function sessionMatchesFeedFilter(
    exercises: readonly FeedFilterExercise[],
    filters: FeedFilterMatchInput,
): boolean {
    if (!filters.exerciseIds.length && !filters.exerciseTypes.length) {
        return (
            !exercises.length ||
            exercises.some((item) => exerciseMatchesFeedFilter(item, filters))
        );
    }

    return exercises.some((item) => exerciseMatchesFeedFilter(item, filters));
}

export function dayMatchesFeedFilter(
    sessions: readonly {exercises: readonly FeedFilterExercise[]}[],
    filters: FeedFilterMatchInput,
): boolean {
    if (!filters.exerciseIds.length && !filters.exerciseTypes.length) {
        return (
            !sessions.length ||
            sessions.some((session) =>
                sessionMatchesFeedFilter(session.exercises, filters),
            )
        );
    }

    return sessions.some((session) =>
        sessionMatchesFeedFilter(session.exercises, filters),
    );
}
