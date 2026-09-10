import {
    EXERCISE_TYPE,
    ExerciseType,
    FeedFilterMatchInput,
    toDateOrUndefined,
    toDayKey,
    toLocalDayKey,
} from '@simple-sport/shared';

export interface HistoryFiltersState {
    showArchived: boolean;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    exerciseIds: string[];
    exerciseTypes: ExerciseType[];
    /** @deprecated legacy persist key; resolved to exerciseIds from the catalog */
    exerciseNames: string[];
}

export function emptyHistoryFilters(): HistoryFiltersState {
    return {
        showArchived: false,
        exerciseIds: [],
        exerciseTypes: [],
        exerciseNames: [],
    };
}

export const EMPTY_HISTORY_FILTERS: HistoryFiltersState = emptyHistoryFilters();

const EXERCISE_TYPES = new Set<string>(Object.values(EXERCISE_TYPE));

interface PersistedHistoryFilters {
    showArchived?: boolean;
    startDate?: string;
    endDate?: string;
    exerciseIds?: string[];
    exerciseTypes?: string[];
    exerciseNames?: string[];
}

export function copyHistoryFilters(filters: HistoryFiltersState): HistoryFiltersState {
    return {
        showArchived: filters.showArchived,
        startDate: filters.startDate,
        endDate: filters.endDate,
        exerciseIds: [...filters.exerciseIds],
        exerciseTypes: [...filters.exerciseTypes],
        exerciseNames: [...filters.exerciseNames],
    };
}

export function toFeedFilterMatch(filters: HistoryFiltersState): FeedFilterMatchInput {
    return {
        exerciseIds: filters.exerciseIds,
        exerciseTypes: filters.exerciseTypes,
        showArchived: filters.showArchived,
    };
}

export function serializeHistoryFilters(filters: HistoryFiltersState): string {
    const persisted: PersistedHistoryFilters = {
        showArchived: filters.showArchived,
        startDate: filters.startDate ? toLocalDayKey(filters.startDate) : undefined,
        endDate: filters.endDate ? toLocalDayKey(filters.endDate) : undefined,
        exerciseIds: [...filters.exerciseIds],
        exerciseTypes: [...filters.exerciseTypes],
    };
    return JSON.stringify(persisted);
}

export function parseHistoryFilters(raw?: string | null): HistoryFiltersState {
    if (!raw) {
        return emptyHistoryFilters();
    }

    try {
        const parsed = JSON.parse(raw) as PersistedHistoryFilters;
        return {
            showArchived: !!parsed.showArchived,
            startDate: toDateOrUndefined(parsed.startDate),
            endDate: toDateOrUndefined(parsed.endDate),
            exerciseIds: readStringList(parsed.exerciseIds),
            exerciseTypes: readExerciseTypes(parsed.exerciseTypes),
            exerciseNames: readStringList(parsed.exerciseNames),
        };
    } catch {
        return emptyHistoryFilters();
    }
}

export function resolveLegacyExerciseFilters(
    filters: HistoryFiltersState,
    catalog: readonly {id: string; name: string}[],
): HistoryFiltersState {
    if (filters.exerciseIds.length || !filters.exerciseNames.length) {
        if (!filters.exerciseNames.length) {
            return filters;
        }

        return {...filters, exerciseNames: []};
    }

    if (!catalog.length) {
        return filters;
    }

    const byName = new Map(
        catalog.map((item) => [item.name.trim().toLowerCase(), item.id]),
    );
    const ids = [
        ...new Set(
            filters.exerciseNames
                .map((name) => byName.get(name.trim().toLowerCase()))
                .filter((id): id is string => !!id),
        ),
    ];
    return {...filters, exerciseIds: ids, exerciseNames: []};
}

export function historyFiltersEqual(
    left: HistoryFiltersState,
    right: HistoryFiltersState,
): boolean {
    return (
        left.showArchived === right.showArchived &&
        toDayKey(left.startDate) === toDayKey(right.startDate) &&
        toDayKey(left.endDate) === toDayKey(right.endDate) &&
        sortedJoin(left.exerciseIds) === sortedJoin(right.exerciseIds) &&
        sortedJoin(left.exerciseTypes) === sortedJoin(right.exerciseTypes) &&
        sortedJoin(left.exerciseNames) === sortedJoin(right.exerciseNames)
    );
}

export function hasActiveHistoryFilters(filters: HistoryFiltersState): boolean {
    return (
        filters.showArchived ||
        !!filters.startDate ||
        !!filters.endDate ||
        filters.exerciseIds.length > 0 ||
        filters.exerciseTypes.length > 0 ||
        filters.exerciseNames.length > 0
    );
}

function readStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(
        (item): item is string => typeof item === 'string' && !!item.trim(),
    );
}

function readExerciseTypes(value: unknown): ExerciseType[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(
        (item): item is ExerciseType =>
            typeof item === 'string' && EXERCISE_TYPES.has(item),
    );
}

function sortedJoin(values: readonly string[]): string {
    return [...values].sort().join('\0');
}
