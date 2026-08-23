import {computed, inject} from '@angular/core';
import {signalStore, withHooks, withMethods, withProps} from '@ngrx/signals';
import {
    DATA_DOMAIN,
    DataRevisionStore,
    ExerciseType,
    OverviewPagedResult,
    resolveFeedToggle,
    toDayKey,
    TrainingSetSnapshot,
    TrainingSummary,
    withEntityIndex,
    withGroupBy,
    withInfinityScroll,
} from '@simple-sport/shared';
import {catchError, map, Observable, of, tap, throwError} from 'rxjs';
import {
    TrainingContractRecord,
    TrainingExerciseView,
    TrainingSqlService,
} from '@simple-sport/integration';
import {FEED_ORIGIN, syncOnRevision} from '../../stores/revision.util';

export interface HistoryStoreFilters {
    showArchived: boolean;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    exerciseIds?: string[];
    exerciseTypes?: ExerciseType[];
}

export const HistoryStore = signalStore(
    {providedIn: 'root'},
    withProps(() => ({
        _trainingApiService: inject(TrainingSqlService),
        _revisions: inject(DataRevisionStore),
    })),
    withInfinityScroll<HistoryStoreFilters, never>()({
        itemsPerPage: 30,
        loader: (request, {_trainingApiService}) => {
            const currentDate = new Date();
            const monthBefore = new Date();
            monthBefore.setMonth(currentDate.getMonth() - 1);

            const filters = request.filters;

            return _trainingApiService
                .queryTrainings({
                    page: {offset: request.offset, limit: request.itemsPerPage},
                    orderBy: [{field: 'date', direction: 'asc'}],
                    dateFrom: toDayKey(monthBefore)!,
                    dateTo: toDayKey(currentDate)!,
                    includeArchivedExercises: filters?.showArchived ?? true,
                    exerciseIds: filters?.exerciseIds,
                    exerciseTypes: filters?.exerciseTypes,
                })
                .pipe(
                    map((x) => {
                        const result: OverviewPagedResult<TrainingSummary> = {
                            items: x,
                            totalCount: x.length,
                        };

                        return result;
                    }),
                );
        },
    }),
    withEntityIndex({
        name: 'training',
        items: (store) => store.items,
        selectId: (x) => x.id,
    }),
    withGroupBy({
        name: 'date',
        items: (s) => s.items,
        selectGroupKey: (t) => toDayKey(t.date) ?? t.date,
    }),
    withProps((store) => ({
        hasLoaded: computed(
            () => store.meta().status === 'resolved' || store.items().length > 0,
        ),
        byDate: computed(() => store._dateGroups()),
    })),
    withMethods((store) => ({
        addTraining(date: Date | string): Observable<TrainingContractRecord> {
            return store._trainingApiService.addEmptyForDate(date).pipe(
                tap(() => {
                    store.refresh();
                }),
            );
        },
        reorderTrainings(date: string, orderedIds: string[]): Observable<void> {
            return store._trainingApiService.reorderTrainings(date, orderedIds).pipe(
                tap(() => store.refresh()),
                catchError((error: unknown) => {
                    const {[date]: _removed, ...rest} = store.pendingOrder();
                    return throwError(() => error);
                }),
            );
        },
        toggleFeedExercise(
            exercise: TrainingExerciseView,
        ): Observable<FeedToggleResult | null> {
            const target = resolveFeedToggle(exercise.sets ?? [], store.pendingDone());

            if (!target?.setIds.length) {
                return of(null);
            }

            // const pendingDone = {...store.pendingDone()};
            //
            // for (const id of target.setIds) {
            //     pendingDone[id] = target.done;
            // }

            return store._trainingApiService
                .setSetsDone({
                    setIds: target.setIds,
                    done: target.done,
                    fillFactFromPlan: target.done,
                    origin: FEED_ORIGIN,
                })
                .pipe(
                    map((snapshots) => ({
                        snapshots,
                        name: exercise.name,
                        count: target.setIds.length,
                        done: target.done,
                    })),
                    catchError((error: unknown) => {
                        return throwError(() => error);
                    }),
                );
        },
        undoFeedSets(snapshots: TrainingSetSnapshot[]): Observable<void> {
            return store._trainingApiService.restoreSets(snapshots, FEED_ORIGIN).pipe(
                catchError((error: unknown) => {
                    const pendingDone = {...store.pendingDone()};

                    for (const snap of snapshots) {
                        pendingDone[snap.id] = !snap.done;
                    }

                    return throwError(() => error);
                }),
            );
        },
        saveDayNote(date: string, text: string): Observable<void> {
            const note = text.trim();

            return store._trainingApiService.saveDayNote(date, text, FEED_ORIGIN).pipe(
                catchError((error: unknown) => {
                    const {[date]: _removed, ...rest} = store.pendingNotes();
                    return throwError(() => error);
                }),
            );
        },
    })),
    withHooks({
        onInit(store) {
            syncOnRevision(
                store._revisions,
                [
                    DATA_DOMAIN.Training,
                    DATA_DOMAIN.TrainingSet,
                    DATA_DOMAIN.Exercise,
                    DATA_DOMAIN.DayNote,
                ],
                () => store.refresh(),
                FEED_ORIGIN,
            );
        },
    }),
);
