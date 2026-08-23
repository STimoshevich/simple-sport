import {computed, inject} from '@angular/core';
import {signalStore, withHooks, withMethods, withProps} from '@ngrx/signals';
import {ExerciseSqlService} from '@simple-sport/integration';
import {
    DATA_DOMAIN,
    DataRevisionStore,
    Exercise,
    ExerciseSaveInput,
    ExerciseType,
    ExerciseWithUsage,
    withEntityIndex,
    withRxResourceState,
    withSearch,
} from '@simple-sport/shared';
import {EMPTY, Observable} from 'rxjs';
import {syncOnRevision} from '../revision.util';

export interface ExerciseDraft {
    id?: string;
    name: string;
    type: ExerciseType;
    comment?: string;
}

export const ExerciseCatalogStore = signalStore(
    {providedIn: 'root'},
    withProps(() => ({
        _api: inject(ExerciseSqlService),
        _revisions: inject(DataRevisionStore),
    })),
    withRxResourceState({
        name: 'exercises',
        eager: true,
        loader: ({store}) => store._api.query({includeArchived: true, withUsage: true}),
    }),
    withEntityIndex({
        name: 'exercise',
        items: (store) => computed(() => store._exercises() ?? []),
        selectId: (item: ExerciseWithUsage) => item.id,
    }),
    withProps((store) => ({
        exercises: computed(() => store._exercises() ?? []),
        activeExercises: computed(() =>
            (store._exercises() ?? []).filter((item) => !item.archived),
        ),
        hasLoaded: computed(
            () => store._exercises() !== undefined || !!store._exercisesMeta.error(),
        ),
        isLoading: computed(() => store._exercisesMeta.isLoading()),
        getById: store._getExerciseById,
        hasId: store._hasExerciseId,
    })),
    withSearch({
        items: (store) => store.activeExercises,
        fields: (item) => [item.name, item.comment ?? ''],
        weight: (item) => item.usageCount,
    }),
    withProps(({_search}) => ({
        search: _search,
    })),
    withMethods((store) => {
        const nameTaken = (name: string, id?: string): boolean => {
            const normalized = name.trim().toLowerCase();

            if (!normalized) {
                return false;
            }

            return store
                .exercises()
                .some(
                    (item) =>
                        item.id !== id && item.name.trim().toLowerCase() === normalized,
                );
        };

        const findByName = (name: string) => {
            const normalized = name.trim().toLowerCase();

            if (!normalized) {
                return undefined;
            }

            return store
                .exercises()
                .find((item) => item.name.trim().toLowerCase() === normalized);
        };

        return {
            nameTaken,
            findByName,
            save(draft: ExerciseDraft): Observable<Exercise> {
                const name = draft.name.trim();

                if (!name || nameTaken(name, draft.id)) {
                    return EMPTY;
                }

                const input: ExerciseSaveInput = draft.id
                    ? {id: draft.id, name, type: draft.type, comment: draft.comment}
                    : {name, type: draft.type, comment: draft.comment};
                return store._api.create(input);
            },
            archive(id: string): Observable<void> {
                return store._api.archive(id);
            },
            restore(id: string): Observable<void> {
                return store._api.restore(id);
            },
        };
    }),
    withHooks({
        onInit(store) {
            syncOnRevision(store._revisions, [DATA_DOMAIN.Exercise], () =>
                store._reloadExercises(),
            );
        },
    }),
);
