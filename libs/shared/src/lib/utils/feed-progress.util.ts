export type ExerciseCheckState = 'empty' | 'none' | 'partial' | 'all';

export interface FeedSetProgress {
    id: string;
    done: boolean;
}

export function applyPendingSetDone(
    sets: FeedSetProgress[],
    pending: Record<string, boolean>,
): FeedSetProgress[] {
    if (!sets.length) {
        return sets;
    }

    let changed = false;
    const next = sets.map((set) => {
        if (!(set.id in pending) || pending[set.id] === set.done) {
            return set;
        }

        changed = true;
        return {...set, done: pending[set.id] === true};
    });
    return changed ? next : sets;
}

export function setProgress(sets: FeedSetProgress[]): {
    doneSets: number;
    totalSets: number;
} {
    let doneSets = 0;

    for (const set of sets) {
        if (set.done) {
            doneSets += 1;
        }
    }

    return {doneSets, totalSets: sets.length};
}

export function exerciseCheckState(
    doneSets: number,
    totalSets: number,
): ExerciseCheckState {
    if (totalSets <= 0) {
        return 'empty';
    }

    if (doneSets <= 0) {
        return 'none';
    }

    if (doneSets >= totalSets) {
        return 'all';
    }

    return 'partial';
}

/** Which sets the feed checkbox should write, given current overlay. */
export function resolveFeedToggle(
    sets: FeedSetProgress[],
    pending: Record<string, boolean>,
): {setIds: string[]; done: boolean} | null {
    const applied = applyPendingSetDone(sets, pending);
    const {doneSets, totalSets} = setProgress(applied);
    const state = exerciseCheckState(doneSets, totalSets);

    if (state === 'empty') {
        return null;
    }

    if (state === 'all') {
        return {setIds: applied.map((set) => set.id), done: false};
    }

    return {setIds: applied.filter((set) => !set.done).map((set) => set.id), done: true};
}

export function isSessionDone(exercises: {checkState: ExerciseCheckState}[]): boolean {
    return (
        exercises.length > 0 &&
        exercises.every((exercise) => exercise.checkState === 'all')
    );
}

export function decorateFeedExercise<T extends {sets?: FeedSetProgress[]}>(
    exercise: T,
    pending: Record<string, boolean>,
): T & {
    sets: FeedSetProgress[];
    doneSets: number;
    totalSets: number;
    checkState: ExerciseCheckState;
} {
    const sets = applyPendingSetDone(exercise.sets ?? [], pending);
    const {doneSets, totalSets} = setProgress(sets);
    return {
        ...exercise,
        sets,
        doneSets,
        totalSets,
        checkState: exerciseCheckState(doneSets, totalSets),
    };
}

export function decorateFeedDays<
    TDay extends {
        trainings: Array<{
            allDone: boolean;
            exercises: Array<{sets?: FeedSetProgress[]}>;
        }>;
    },
>(days: TDay[], pending: Record<string, boolean> = {}): TDay[] {
    return days.map((day) => ({
        ...day,
        trainings: day.trainings.map((session) => {
            const exercises = session.exercises.map((exercise) =>
                decorateFeedExercise(exercise, pending),
            );
            return {
                ...session,
                exercises,
                allDone: isSessionDone(exercises),
            };
        }),
    }));
}

export function sessionDisplayName(
    name: string | undefined,
    exerciseNames: string[],
    fallback: string,
    andMore: string,
    moreSuffix: string,
): string {
    const trimmed = name?.trim() ?? '';

    if (trimmed) {
        return trimmed;
    }

    const names = exerciseNames.map((item) => item.trim()).filter(Boolean);

    if (!names.length) {
        return fallback;
    }

    const first = names[0];

    if (names.length === 1 || !first) {
        return first || fallback;
    }

    return [first, andMore, String(names.length - 1), moreSuffix]
        .filter((part) => part !== '')
        .join(' ');
}

export function applyTrainingOrder<
    T extends {date: string; trainings: Array<{id: string}>},
>(days: T[], pendingOrder: Record<string, string[]>): T[] {
    const dates = Object.keys(pendingOrder);

    if (!dates.length) {
        return days;
    }

    return days.map((day) => {
        const order = pendingOrder[day.date];

        if (!order?.length) {
            return day;
        }

        const byId = new Map(day.trainings.map((training) => [training.id, training]));
        const next: T['trainings'] = [];

        for (const id of order) {
            const training = byId.get(id);

            if (!training) {
                continue;
            }

            next.push(training);
            byId.delete(id);
        }

        for (const training of byId.values()) {
            next.push(training);
        }

        return {...day, trainings: next};
    });
}
