import {computed, inject} from '@angular/core';
import {patchState, signalStore, withMethods, withProps, withState} from '@ngrx/signals';
import {
    copySetValues,
    createGuid,
    Exercise,
    fillFactFromPlan,
    hasCopyableValues,
    hasFactMetrics,
    missingExerciseIds,
    nowUtc,
    rankExercisesForPicker,
    resolveFeedToggle,
    todayLocal,
    clampNote,
    withDiffChanges,
    withEntityIndex,
    withRenumberedSort,
    withRxResourceState,
    withSelectionState,
} from '@simple-sport/shared';
import {EMPTY, map, Observable, of, switchMap, tap, throwError} from 'rxjs';
import {
    TrainingContractRecord,
    TrainingExerciseView,
    TrainingSetView,
    TrainingSqlService,
} from '@simple-sport/integration';
import {ExerciseCatalogStore, ExerciseDraft} from './global/exercise-catalog.store';
import {UnitsStore} from './units.store';
import {toCanonicalWorkout, toDisplaySet, toDisplayWorkout} from '../utils/display-units';

function withSets(
    workout: TrainingExerciseView,
    sets: TrainingSetView[],
): TrainingExerciseView {
    const numbered = withRenumberedSort(sets);
    const first = numbered[0];
    return {
        ...workout,
        sets: numbered,
        weight: first?.weight,
        reps: first?.reps,
        distance: first?.distance,
        duration: first?.duration,
        plannedWeight: first?.plannedWeight,
        plannedReps: first?.plannedReps,
        plannedDistance: first?.plannedDistance,
        plannedDuration: first?.plannedDuration,
    };
}

function draftSet(
    sortOrder: number,
    values: Partial<TrainingSetView> = {},
): TrainingSetView {
    return {
        id: createGuid(),
        sortOrder,
        ...copySetValues(values),
        done: false,
        doneAt: undefined,
        draft: true,
    };
}

export const WorkoutEditorStore = signalStore(
    withProps(() => ({
        _trainingSql: inject(TrainingSqlService),
        _catalog: inject(ExerciseCatalogStore),
        _units: inject(UnitsStore),
    })),
    withState({
        trainingId: '',
        date: todayLocal(),
        name: '',
        comment: '',
    }),
    withRxResourceState({
        name: 'workouts',
        eager: true,
        requestValue: (store) => {
            const id = store.trainingId();

            if (!id) {
                return undefined;
            }

            return `${id}:${store._units.weightUnit()}:${store._units.distanceUnit()}`;
        },
        loader: ({request, store}) => {
            const trainingId = (request ?? '').split(':')[0] ?? '';

            if (!trainingId) {
                return of([]);
            }

            return store._trainingSql.getEditorSnapshot(trainingId).pipe(
                tap((snapshot) => {
                    if (!snapshot) {
                        return;
                    }

                    patchState(store, {
                        date: snapshot.date || store.date(),
                        name: snapshot.name ?? '',
                        comment: snapshot.comment ?? '',
                    });
                }),
                map((snapshot) =>
                    (snapshot?.exercises ?? []).map((item) =>
                        toDisplayWorkout(item, store._units.units()),
                    ),
                ),
            );
        },
    }),
    withEntityIndex({
        name: 'workout',
        items: (store) => computed(() => store._workouts() ?? []),
        selectId: (workout) => workout.id,
    }),
    withDiffChanges({
        name: 'workout',
        source: (store) => computed(() => store._workouts() ?? []),
        selectId: (workout) => workout.id,
    }),
    withSelectionState({
        name: 'dirty',
        multiple: true,
        initialValue: [] as string[],
    }),
    withSelectionState({
        name: 'invalid',
        multiple: true,
        initialValue: [] as string[],
    }),
    withProps((store) => ({
        workouts: computed(() => store._workouts() ?? []),
        isChooser: computed(() => !store.trainingId()),
        isPlanned: computed(() => store.date() > todayLocal()),
        weightUnitKey: store._units.weightUnitKey,
        distanceUnitKey: store._units.distanceUnitKey,
        units: store._units.units,
        catalogNames: computed(() =>
            rankExercisesForPicker(store._catalog.exercises()).map((item) => item.name),
        ),
        availableNames: computed(() => {
            const names = rankExercisesForPicker(store._catalog.exercises()).map(
                (item) => item.name,
            );

            for (const workout of store._workouts() ?? []) {
                const name = workout.name.trim();

                if (name && !names.includes(name)) {
                    names.push(name);
                }
            }

            return names;
        }),
        hasUnsavedChanges: store._dirty.hasValue,
        exerciseChanges: store._workoutChanges,
        validationErrorById: computed(() => {
            const errors: Record<string, boolean> = {};

            for (const id of store._invalid.selected()) {
                errors[id] = true;
            }

            return errors;
        }),
    })),
    withMethods((store) => {
        const resolveNamed = (names: string[]): Exercise[] => {
            const active = store._catalog.activeExercises();
            return names.flatMap((name) => {
                const exercise = active.find((item) => item.name === name);
                return exercise ? [exercise] : [];
            });
        };

        const replaceWorkout = (
            workoutId: string,
            mutate: (workout: TrainingExerciseView) => TrainingExerciseView,
        ): TrainingExerciseView | undefined => {
            let updated: TrainingExerciseView | undefined;
            store._updateWorkouts((workouts) =>
                workouts.map((workout) => {
                    if (workout.id !== workoutId) {
                        return workout;
                    }

                    updated = mutate(workout);
                    return updated;
                }),
            );

            if (updated) {
                store._dirty.select(workoutId);
            }

            return updated;
        };

        const assignExercise = (workoutId: string, exercise: Exercise): void => {
            replaceWorkout(workoutId, (workout) => ({
                ...workout,
                name: exercise.name,
                type: exercise.type,
                exerciseId: exercise.id,
            }));
            store._invalid.deselect(workoutId);
        };

        const addResolved = (
            exercises: Exercise[],
        ): Observable<TrainingContractRecord[]> => {
            const trainingId = store.trainingId();

            if (!trainingId || !exercises.length) {
                return EMPTY;
            }

            return store._trainingSql.addEmptySets(trainingId, exercises).pipe(
                tap((created) => {
                    const units = store._units.units();
                    store._updateWorkouts((workouts) => [
                        ...(workouts ?? []),
                        ...created.map((item) => toDisplayWorkout(item, units)),
                    ]);
                }),
            );
        };

        const createWithResolved = (
            exercises: Exercise[],
        ): Observable<TrainingContractRecord[]> => {
            if (!exercises.length) {
                return EMPTY;
            }

            return store._trainingSql.addEmptyForDate(store.date()).pipe(
                switchMap((created) => {
                    const trainingId = created.trainingId ?? created.id;
                    return store._trainingSql
                        .addEmptySets(trainingId, exercises)
                        .pipe(tap(() => patchState(store, {trainingId})));
                }),
            );
        };

        const attach = (
            exercise: Exercise,
            targetWorkoutId?: string,
        ): Observable<void> => {
            if (targetWorkoutId) {
                assignExercise(targetWorkoutId, exercise);
                return of(undefined);
            }

            if (!store.trainingId()) {
                return createWithResolved([exercise]).pipe(map(() => undefined));
            }

            return addResolved([exercise]).pipe(map(() => undefined));
        };

        const persistDone = (sets: TrainingSetView[], done: boolean): void => {
            const ids = sets.filter((set) => !set.draft).map((set) => set.id);

            if (!ids.length) {
                return;
            }

            store._trainingSql
                .setSetsDone({setIds: ids, done, fillFactFromPlan: done})
                .subscribe({error: () => undefined});
        };

        const toggleSetDone = (
            workoutId: string,
            setId: string,
            done?: boolean,
            persist = true,
        ): void => {
            const workout = store._getWorkoutById(workoutId);
            const current = workout?.sets?.find((set) => set.id === setId);

            if (!current) {
                return;
            }

            const nextDone = done ?? !current.done;
            const patched = nextDone
                ? {...fillFactFromPlan(current), done: true, doneAt: nowUtc()}
                : {...current, done: false, doneAt: undefined};
            replaceWorkout(workoutId, (item) =>
                withSets(
                    item,
                    (item.sets ?? []).map((set) => (set.id === setId ? patched : set)),
                ),
            );

            if (persist) {
                persistDone([patched], nextDone);
            }
        };

        const validate = (): boolean => {
            store._invalid.clear();

            for (const id of missingExerciseIds(store._workouts() ?? [])) {
                store._invalid.select(id);
            }

            return !store._invalid.hasValue();
        };

        return {
            open(trainingId: string, date?: string): void {
                patchState(store, {trainingId, date: date || store.date()});
            },
            setDate(date: string): void {
                if (date === store.date()) {
                    return;
                }

                patchState(store, {date});
                store._updateWorkouts((workouts) =>
                    workouts.map((workout) => ({...workout, date})),
                );

                if (store.trainingId()) {
                    store._dirty.select('form');
                }
            },
            setName(name: string): void {
                if (name === store.name()) {
                    return;
                }

                patchState(store, {name});
                store._dirty.select('form');
            },
            setComment(comment: string): void {
                const next = clampNote(comment);

                if (next === store.comment()) {
                    return;
                }

                patchState(store, {comment: next});
                store._dirty.select('form');
            },
            setExerciseComment(workoutId: string, comment: string): void {
                const next = clampNote(comment);
                const current = store._getWorkoutById(workoutId);

                if (!current || (current.comment ?? '') === next) {
                    return;
                }

                replaceWorkout(workoutId, (workout) => ({...workout, comment: next}));
            },
            catalogComment(exerciseId?: string): string {
                if (!exerciseId) {
                    return '';
                }

                return store._catalog.getById(exerciseId)?.comment?.trim() ?? '';
            },
            markDirty(): void {
                store._dirty.select('form');
            },
            findExerciseByName(name: string) {
                return store._catalog.findByName(name);
            },
            assignExercise,
            onExerciseSelected(workoutId: string, selected: string[]): void {
                const selectedName = selected[0];
                const catalog = store._catalog
                    .activeExercises()
                    .find((item) => item.name === selectedName);
                replaceWorkout(workoutId, (workout) => ({
                    ...workout,
                    name: selectedName ?? workout.name,
                    type: catalog?.type ?? workout.type,
                    exerciseId: catalog?.id ?? workout.exerciseId,
                }));

                if (selectedName?.trim()) {
                    store._invalid.deselect(workoutId);
                }
            },
            onSetChange(
                workoutId: string,
                setId: string,
                patch: Partial<TrainingSetView>,
            ): void {
                replaceWorkout(workoutId, (workout) =>
                    withSets(
                        workout,
                        (workout.sets ?? []).map((set) =>
                            set.id === setId ? {...set, ...patch} : set,
                        ),
                    ),
                );
            },
            addSet(workoutId: string): Observable<void> {
                const workout = store._getWorkoutById(workoutId);

                if (!workout) {
                    return EMPTY;
                }

                const sets = workout.sets ?? [];
                const last = sets[sets.length - 1];

                if (last && hasCopyableValues(last)) {
                    replaceWorkout(workoutId, (item) =>
                        withSets(item, [
                            ...(item.sets ?? []),
                            draftSet(sets.length, last),
                        ]),
                    );
                    return of(undefined);
                }

                if (!workout.exerciseId) {
                    replaceWorkout(workoutId, (item) =>
                        withSets(item, [...(item.sets ?? []), draftSet(sets.length)]),
                    );
                    return of(undefined);
                }

                return store._trainingSql
                    .getLastSetsFor(workout.exerciseId, store.trainingId())
                    .pipe(
                        tap((history) => {
                            const source = history[history.length - 1];
                            const values = source
                                ? toDisplaySet(
                                      {
                                          id: '',
                                          sortOrder: 0,
                                          done: false,
                                          weight: source.weight,
                                          reps: source.reps,
                                          distance: source.distance,
                                          duration: source.duration,
                                      },
                                      store._units.units(),
                                  )
                                : {};
                            replaceWorkout(workoutId, (item) =>
                                withSets(item, [
                                    ...(item.sets ?? []),
                                    draftSet((item.sets ?? []).length, values),
                                ]),
                            );
                        }),
                        map(() => undefined),
                    );
            },
            removeSet(workoutId: string, setId: string): TrainingSetView | undefined {
                const workout = store._getWorkoutById(workoutId);

                if (!workout) {
                    return undefined;
                }

                const removed = (workout.sets ?? []).find((set) => set.id === setId);
                replaceWorkout(workoutId, (item) =>
                    withSets(
                        item,
                        (item.sets ?? []).filter((set) => set.id !== setId),
                    ),
                );
                return removed;
            },
            insertSet(workoutId: string, set: TrainingSetView, index: number): void {
                replaceWorkout(workoutId, (item) => {
                    const next = [...(item.sets ?? [])];
                    next.splice(index, 0, set);
                    return withSets(item, next);
                });
            },
            removeExercise(workoutId: string): TrainingExerciseView | undefined {
                const workout = store._getWorkoutById(workoutId);

                if (!workout) {
                    return undefined;
                }

                store._updateWorkouts((workouts) =>
                    (workouts ?? []).filter((item) => item.id !== workoutId),
                );
                store._dirty.select(workoutId);
                store._invalid.deselect(workoutId);
                return workout;
            },
            insertExercise(workout: TrainingExerciseView, index: number): void {
                store._updateWorkouts((workouts) => {
                    const next = [...(workouts ?? [])];
                    next.splice(index, 0, workout);
                    return next;
                });
                store._dirty.select(workout.id);
            },
            reorderSets(
                workoutId: string,
                previousIndex: number,
                currentIndex: number,
            ): void {
                if (previousIndex === currentIndex) {
                    return;
                }

                replaceWorkout(workoutId, (item) => {
                    const next = [...(item.sets ?? [])];
                    const [moved] = next.splice(previousIndex, 1);

                    if (!moved) {
                        return item;
                    }

                    next.splice(currentIndex, 0, moved);
                    return withSets(item, next);
                });
            },
            toggleSetDone,
            toggleExerciseDone(workoutId: string): void {
                const workout = store._getWorkoutById(workoutId);

                if (!workout) {
                    return;
                }

                const target = resolveFeedToggle(workout.sets ?? [], {});

                if (!target?.setIds.length) {
                    return;
                }

                const idSet = new Set(target.setIds);
                const changed: TrainingSetView[] = [];
                replaceWorkout(workoutId, (item) =>
                    withSets(
                        item,
                        (item.sets ?? []).map((set) => {
                            if (!idSet.has(set.id)) {
                                return set;
                            }

                            const patched = target.done
                                ? {...fillFactFromPlan(set), done: true, doneAt: nowUtc()}
                                : {...set, done: false, doneAt: undefined};
                            changed.push(patched);
                            return patched;
                        }),
                    ),
                );
                persistDone(changed, target.done);
            },
            autoCompleteSet(workoutId: string, setId: string): void {
                const workout = store._getWorkoutById(workoutId);
                const current = workout?.sets?.find((set) => set.id === setId);

                if (!current || current.done || !hasFactMetrics(workout?.type, current)) {
                    return;
                }

                toggleSetDone(workoutId, setId, true, false);
            },
            validate,
            save(): Observable<void> {
                if (!validate()) {
                    return throwError(() => ({code: 'invalid'}));
                }

                const trainingId = store.trainingId();

                if (!trainingId) {
                    return EMPTY;
                }

                const workouts = (store._workouts() ?? []).map((workout) =>
                    toCanonicalWorkout(
                        {...workout, date: store.date()},
                        store._units.units(),
                    ),
                );
                return store._trainingSql
                    .saveEditor({
                        trainingId,
                        date: store.date(),
                        name: store.name(),
                        comment: store.comment().trim() || undefined,
                        exercises: workouts,
                    })
                    .pipe(tap(() => store._dirty.clear()));
            },
            deleteTraining(): Observable<void> {
                const trainingId = store.trainingId();

                if (!trainingId) {
                    return EMPTY;
                }

                return store._trainingSql.deleteTraining(trainingId).pipe(
                    tap(() => {
                        store._dirty.clear();
                        store._invalid.clear();
                        patchState(store, {trainingId: '', name: '', comment: ''});
                        store._updateWorkouts(() => []);
                    }),
                );
            },
            createEmpty(): Observable<void> {
                return store._trainingSql.addEmptyForDate(store.date()).pipe(
                    tap((created) =>
                        patchState(store, {trainingId: created.trainingId ?? created.id}),
                    ),
                    map(() => undefined),
                );
            },
            createWithExercises(names: string[]): Observable<TrainingContractRecord[]> {
                return createWithResolved(resolveNamed(names));
            },
            addExercises(names: string[]): Observable<TrainingContractRecord[]> {
                return addResolved(resolveNamed(names));
            },
            createExerciseAndAdd(
                draft: ExerciseDraft,
                targetWorkoutId?: string,
            ): Observable<void> {
                return store._catalog
                    .save(draft)
                    .pipe(switchMap((exercise) => attach(exercise, targetWorkoutId)));
            },
            restoreAndAdd(
                exercise: Exercise,
                targetWorkoutId?: string,
            ): Observable<void> {
                return store._catalog
                    .restore(exercise.id)
                    .pipe(switchMap(() => attach(exercise, targetWorkoutId)));
            },
        };
    }),
);

/** @deprecated use WorkoutEditorStore */
export const WorkoutDetailStore = WorkoutEditorStore;
