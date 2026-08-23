import {inject, Injectable} from '@angular/core';
import {
    dayMatchesFeedFilter,
    Exercise,
    exerciseMatchesFeedFilter,
    FeedFilterMatchInput,
    isPersistableSet,
    sessionMatchesFeedFilter,
    SetsDoneInput,
    toDayKey,
    toLocalDayKey,
    TrainingDay,
    TrainingExerciseFull,
    TrainingFull,
    TrainingQuery,
    TrainingSetSnapshot,
    TrainingSummary,
} from '@simple-sport/shared';
import {map, Observable, of, switchMap} from 'rxjs';
import {ExerciseRepository, TrainingRepository} from '../repositories';
import {
    HistoryFiltersState,
    toFeedFilterMatch,
} from '../models/history-filters.model';
import {
    TrainingDayView,
    TrainingExerciseView,
    TrainingSessionView,
    TrainingSetView,
} from '../models/training-contract.model';

export interface FeedExtraView {
    hasEverTrained: boolean;
    hasMatchingDays: boolean;
    futureDays: TrainingDayView[];
}

@Injectable({providedIn: 'root'})
export class TrainingSqlService {
    private readonly trainings = inject(TrainingRepository);
    private readonly exercises = inject(ExerciseRepository);

    // listFeedPage(request: {
    //     today: string;
    //     offset: number;
    //     itemsPerPage: number;
    //     filters: HistoryFiltersState;
    // }): Observable<OverviewPagedResult<TrainingDayView> & {extra?: FeedExtraView}> {
    //     const filterFrom = request.filters.startDate
    //         ? toLocalDayKey(request.filters.startDate)
    //         : undefined;
    //     const filterTo = request.filters.endDate
    //         ? toLocalDayKey(request.filters.endDate)
    //         : undefined;
    //
    //     return this.trainings.queryDateBounds().pipe(
    //         switchMap((bounds) => {
    //             const window = resolvePastWindow({
    //                 today: request.today,
    //                 offset: request.offset,
    //                 itemsPerPage: request.itemsPerPage,
    //                 earliestDate: bounds.minDate,
    //                 filterFrom,
    //                 filterTo,
    //             });
    //             const past$ = window
    //                 ? this.listCalendarWindow({
    //                       from: window.from,
    //                       to: window.to,
    //                       today: request.today,
    //                       filters: request.filters,
    //                   })
    //                 : of([] as TrainingDayView[]);
    //
    //             return past$.pipe(
    //                 switchMap((days) => {
    //                     const page = {
    //                         items: [...days].reverse(),
    //                         totalCount: window?.totalCount ?? 0,
    //                     };
    //
    //                     if (request.offset > 0) {
    //                         return of(page);
    //                     }
    //
    //                     const future = resolveFutureWindow({
    //                         today: request.today,
    //                         latestDate: bounds.maxDate,
    //                         filterFrom,
    //                         filterTo,
    //                     });
    //                     const future$ = future
    //                         ? this.listCalendarWindow({
    //                               from: future.from,
    //                               to: future.to,
    //                               today: request.today,
    //                               filters: request.filters,
    //                           })
    //                         : of([] as TrainingDayView[]);
    //
    //                     return future$.pipe(
    //                         map((futureDays) => ({
    //                             ...page,
    //                             extra: {
    //                                 hasEverTrained: !!bounds.minDate,
    //                                 hasMatchingDays:
    //                                     page.items.length > 0 || futureDays.length > 0,
    //                                 futureDays,
    //                             },
    //                         })),
    //                     );
    //                 }),
    //             );
    //         }),
    //     );
    // }

    // listCalendarWindow(request: {
    //     from: string;
    //     to: string;
    //     today: string;
    //     filters: HistoryFiltersState;
    // }): Observable<TrainingDayView[]> {
    //     return forkJoin({
    //         result: this.trainings.queryDays({
    //             dateFrom: request.from,
    //             dateTo: request.to,
    //             includeArchivedExercises: true,
    //             orderBy: trainingOrderBy('date', 'desc').thenBy('sortOrder'),
    //             page: {offset: 0, limit: 10_000},
    //         }),
    //         notes: this.trainings.queryDayNotes(request.from, request.to),
    //     }).pipe(
    //         map(({result, notes}) => {
    //             const byDate = new Map(result.items.map((day) => [day.date, day]));
    //             const noteByDate = new Map(notes.map((note) => [note.date, note]));
    //             return enumerateDayKeys(request.from, request.to).map((date) =>
    //                 toDayView(
    //                     {
    //                         date,
    //                         trainings: byDate.get(date)?.trainings ?? [],
    //                         note: noteByDate.get(date),
    //                     },
    //                     request.filters,
    //                     request.today,
    //                 ),
    //             );
    //         }),
    //     );
    // }

    listActiveExercises(): Observable<Exercise[]> {
        return this.exercises
            .query({includeArchived: false})
            .pipe(
                map((items) =>
                    items.map(
                        ({usageCount: _u, lastUsedAt: _l, ...exercise}) => exercise,
                    ),
                ),
            );
    }

    listAllNames(): Observable<string[]> {
        return this.exercises
            .query({includeArchived: true})
            .pipe(
                map((items) => [
                    ...new Set(items.map((item) => item.name.trim()).filter(Boolean)),
                ]),
            );
    }

    saveTrainingDate(trainingId: string, date: string): Observable<void> {
        if (!trainingId || !date) {
            return of(undefined);
        }

        return this.trainings.getTraining(trainingId).pipe(
            switchMap((current) => {
                if (!current || current.date === date) {
                    return of(undefined);
                }

                return this.trainings
                    .saveTraining({
                        id: current.id,
                        date,
                        name: current.name,
                        comment: current.comment,
                        sortOrder: current.sortOrder,
                        templateId: current.templateId,
                        exercises: [],
                        // exercises: current.exercises.map((item) => toDraft(item)),
                    })
                    .pipe(map(() => undefined));
            }),
        );
    }

    addEmptyForDate(date: Date | string): Observable<TrainingExerciseView> {
        const dayKey =
            typeof date === 'string' ? (toDayKey(date) ?? date) : toLocalDayKey(date);
        return this.trainings.queryTrainings({dateFrom: dayKey, dateTo: dayKey}).pipe(
            switchMap((existing) =>
                this.trainings.saveTraining({
                    date: dayKey,
                    name: existing.length === 0 ? '' : `training${existing.length + 1}`,
                    sortOrder: existing.length,
                    exercises: [],
                }),
            ),
            map((training) => toEmptyView(training)),
        );
    }

    queryTrainings(q: TrainingQuery): Observable<TrainingSummary[]> {
        return this.trainings.queryTrainings(q);
    }

    reorderTrainings(date: string, orderedIds: string[]): Observable<void> {
        return this.trainings.reorderTrainings(date, orderedIds);
    }

    setSetsDone(input: SetsDoneInput): Observable<TrainingSetSnapshot[]> {
        return this.trainings.setSetsDone(input);
    }

    restoreSets(snapshots: TrainingSetSnapshot[], origin?: string): Observable<void> {
        return this.trainings.restoreSets(snapshots, origin);
    }

    saveDayNote(date: string, text: string, origin?: string): Observable<void> {
        if (!date) {
            return of(undefined);
        }

        return this.trainings.saveDayNote(date, text, origin);
    }

    getLastSetsFor(
        exerciseId: string,
        excludeTrainingId?: string,
    ): Observable<TrainingSetSnapshot[]> {
        if (!exerciseId) {
            return of([]);
        }

        return this.trainings.getLastSetsFor(exerciseId, excludeTrainingId);
    }

    listSetsByTrainingId(trainingId: string): Observable<TrainingExerciseView[]> {
        if (!trainingId) {
            return of([]);
        }

        return this.trainings
            .getTraining(trainingId)
            .pipe(map((training) => (training ? flattenTraining(training) : [])));
    }

    getEditorSnapshot(trainingId: string): Observable<
        | {
              date: string;
              name?: string;
              comment?: string;
              exercises: TrainingExerciseView[];
          }
        | undefined
    > {
        if (!trainingId) {
            return of(undefined);
        }

        return this.trainings.getTraining(trainingId).pipe(
            map((training) =>
                training
                    ? {
                          date: training.date,
                          name: training.name,
                          comment: training.comment,
                          exercises: flattenTraining(training),
                      }
                    : undefined,
            ),
        );
    }

    addEmptySet(
        trainingId: string,
        exercise: Exercise,
    ): Observable<TrainingExerciseView> {
        return this.trainings.getTraining(trainingId).pipe(
            switchMap((training) => {
                if (!training) {
                    return of(undefined as unknown as TrainingFull);
                }

                return this.trainings.saveTraining({
                    id: training.id,
                    date: training.date,
                    name: training.name,
                    comment: training.comment,
                    sortOrder: training.sortOrder,
                    templateId: training.templateId,
                    exercises: [],
                    //     [
                    //     ...training.exercises.map((item) => toDraft(item)),
                    //     {
                    //         exerciseId: exercise.id,
                    //         sortOrder: training.exercises.length,
                    //         sets: [],
                    //     },
                    // ],
                });
            }),
            map((training) => {
                // const last = training.exercises[training.exercises.length - 1];
                const last = false;
                return last ? toExerciseView(training, last) : toEmptyView(training);
            }),
        );
    }

    addEmptySets(
        trainingId: string,
        exercises: Exercise[],
    ): Observable<TrainingExerciseView[]> {
        if (!trainingId || !exercises.length) {
            return of([]);
        }

        return this.trainings.getTraining(trainingId).pipe(
            switchMap((training) => {
                if (!training) {
                    return of([]);
                }

                return this.trainings
                    .saveTraining({
                        id: training.id,
                        date: training.date,
                        name: training.name,
                        comment: training.comment,
                        sortOrder: training.sortOrder,
                        templateId: training.templateId,
                        exercises: [],
                        //     [
                        //     ...training.exercises.map((item) => toDraft(item)),
                        //     ...exercises.map((exercise, index) => ({
                        //         exerciseId: exercise.id,
                        //         // sortOrder: training.exercises.length + index,
                        //         sets: [],
                        //     })),
                        // ],
                    })
                    .pipe(
                        map((saved) => {
                            const all = flattenTraining(saved);
                            return all.slice(-exercises.length);
                        }),
                    );
            }),
        );
    }

    saveEditor(input: {
        trainingId: string;
        date: string;
        name?: string;
        comment?: string;
        exercises: TrainingExerciseView[];
    }): Observable<void> {
        if (!input.trainingId) {
            return of(undefined);
        }

        return this.trainings.getTraining(input.trainingId).pipe(
            switchMap((current) =>
                this.trainings
                    .saveTraining({
                        id: input.trainingId,
                        date: input.date,
                        name: input.name,
                        comment: input.comment,
                        sortOrder: current?.sortOrder ?? 0,
                        templateId: current?.templateId,
                        exercises: input.exercises.map((view, index) => ({
                            id: view.id,
                            exerciseId: view.exerciseId,
                            sortOrder: index,
                            comment: view.comment?.trim() || undefined,
                            sets: (view.sets ?? [])
                                .filter((set) => isPersistableSet(set))
                                .map((set, setIndex) => ({
                                    id: set.draft ? undefined : set.id,
                                    sortOrder: setIndex,
                                    weight: set.weight,
                                    reps: set.reps,
                                    distance: set.distance,
                                    duration: set.duration,
                                    plannedWeight: set.plannedWeight,
                                    plannedReps: set.plannedReps,
                                    plannedDistance: set.plannedDistance,
                                    plannedDuration: set.plannedDuration,
                                    done: set.done,
                                    doneAt: set.doneAt,
                                })),
                        })),
                    })
                    .pipe(map(() => undefined)),
            ),
        );
    }

    deleteTraining(trainingId: string): Observable<void> {
        if (!trainingId) {
            return of(undefined);
        }

        return this.trainings.deleteTrainings([trainingId]);
    }

    saveSets(workouts: TrainingExerciseView[]): Observable<void> {
        const trainingId = workouts[0]?.trainingId;

        if (!trainingId) {
            return of(undefined);
        }

        return this.saveEditor({
            trainingId,
            date: workouts[0]?.date ?? '',
            name: workouts[0]?.trainingName,
            comment: workouts[0]?.trainingComment,
            exercises: workouts,
        });
    }

    getProgressSeriesByName(
        name: string,
        days = 20,
    ): Observable<{
        dates: string[];
        reps: number[];
        weights: number[];
        plannedReps: number[];
        plannedWeights: number[];
    }> {
        const range = dateRangeKeys(days);
        return this.trainings
            .queryTrainings({
                dateFrom: range[0],
                dateTo: range[range.length - 1],
                page: {offset: 0, limit: days},
            })
            .pipe(
                map((trainings) => {
                    const repsByDate = new Map<string, number>();
                    const weightsByDate = new Map<string, number>();
                    const plannedRepsByDate = new Map<string, number>();
                    const plannedWeightsByDate = new Map<string, number>();

                    for (const training of trainings) {
                        let reps = 0;
                        let weight = 0;
                        let plannedReps = 0;
                        let plannedWeight = 0;

                        // Агрегация по сетам упражнения отключена: TrainingSummary
                        // не содержит сетов, поэтому пока считаем нулями
                        // (прежнее поведение закомментированного цикла).

                        repsByDate.set(training.date, reps);
                        weightsByDate.set(training.date, weight);
                        plannedRepsByDate.set(training.date, plannedReps);
                        plannedWeightsByDate.set(training.date, plannedWeight);
                    }

                    return {
                        dates: range.map((day) => day.slice(5)),
                        reps: range.map((day) => repsByDate.get(day) ?? 0),
                        weights: range.map((day) => weightsByDate.get(day) ?? 0),
                        plannedReps: range.map((day) => plannedRepsByDate.get(day) ?? 0),
                        plannedWeights: range.map(
                            (day) => plannedWeightsByDate.get(day) ?? 0,
                        ),
                    };
                }),
            );
    }
}

function toDayView(
    day: TrainingDay,
    filters: HistoryFiltersState,
    today: string,
): TrainingDayView {
    const match = toFeedFilterMatch(filters);
    const trainings = day.trainings.map((training) => toSessionView(training, match));
    return {
        groupId: day.date,
        date: day.date,
        note: day.note?.text,
        isToday: day.date === today,
        isFuture: day.date > today,
        trainings,
        muted: !dayMatchesFeedFilter(trainings, match),
    };
}

function toSessionView(
    training: TrainingFull,
    match: FeedFilterMatchInput,
): TrainingSessionView {
    const exercises = flattenTraining(training).map((exercise) => ({
        ...exercise,
        muted: !exerciseMatchesFeedFilter(
            {
                exerciseId: exercise.exerciseId,
                type: exercise.type,
                archived: exercise.archived,
            },
            match,
        ),
    }));
    return {
        id: training.id,
        name: training.name ?? '',
        comment: training.comment,
        allDone: false,
        exercises,
        muted: !sessionMatchesFeedFilter(exercises, match),
    };
}

function flattenTraining(training: TrainingFull): TrainingExerciseView[] {
    return [];
    // return training.exercises.map((exercise) => toExerciseView(training, exercise));
}

function toExerciseView(
    training: TrainingFull,
    exercise: TrainingExerciseFull,
): TrainingExerciseView {
    const sets = exercise.sets.map((item) => toSetView(item));
    const set = sets[0];
    return {
        id: exercise.id,
        name: exercise.exerciseName,
        type: exercise.exerciseType,
        reps: set?.reps,
        weight: set?.weight,
        plannedWeight: set?.plannedWeight,
        plannedReps: set?.plannedReps,
        distance: set?.distance,
        plannedDistance: set?.plannedDistance,
        duration: set?.duration,
        plannedDuration: set?.plannedDuration,
        archived: exercise.exerciseArchived,
        exerciseId: exercise.exerciseId,
        trainingId: training.id,
        date: training.date,
        trainingName: training.name,
        trainingComment: training.comment,
        comment: exercise.comment,
        sets,
    };
}

function toSetView(set: TrainingExerciseFull['sets'][number]): TrainingSetView {
    return {
        id: set.id,
        sortOrder: set.sortOrder,
        weight: set.weight,
        reps: set.reps,
        distance: set.distance,
        duration: set.duration,
        plannedWeight: set.plannedWeight,
        plannedReps: set.plannedReps,
        plannedDistance: set.plannedDistance,
        plannedDuration: set.plannedDuration,
        done: set.done,
        doneAt: set.doneAt,
    };
}

function toEmptyView(training: TrainingFull): TrainingExerciseView {
    return {
        id: training.id,
        name: '',
        trainingId: training.id,
        date: training.date,
        trainingName: training.name,
        trainingComment: training.comment,
    };
}

function toDraft(exercise: TrainingExerciseFull) {
    return {
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        sortOrder: exercise.sortOrder,
        comment: exercise.comment,
        sourceTemplateExerciseId: exercise.sourceTemplateExerciseId,
        sets: exercise.sets.map((set) => ({
            id: set.id,
            sortOrder: set.sortOrder,
            weight: set.weight,
            reps: set.reps,
            distance: set.distance,
            duration: set.duration,
            plannedWeight: set.plannedWeight,
            plannedReps: set.plannedReps,
            plannedDistance: set.plannedDistance,
            plannedDuration: set.plannedDuration,
            done: set.done,
            sourceTemplateSetId: set.sourceTemplateSetId,
        })),
    };
}

function dateRangeKeys(days: number): string[] {
    const today = new Date();
    const range: string[] = [];

    for (let i = days - 1; i >= 0; i -= 1) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        range.push(toLocalDayKey(date));
    }

    return range;
}
