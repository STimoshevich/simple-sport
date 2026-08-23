import {computed, inject} from '@angular/core';
import {signalStore, withHooks, withProps} from '@ngrx/signals';
import {
    DATA_DOMAIN,
    DataRevisionStore,
    TemplateSummary,
    withEntityIndex,
    withRxResourceState,
} from '@simple-sport/shared';
import {of} from 'rxjs';
import {syncOnRevision} from '../revision.util';

/**
 * Каталог шаблонов тренировок целиком в памяти.
 *
 * Заготовка: `TemplateRepository` ещё не реализован (Epic 7, docs/BUSINESS-PLAN.md §Репозитории),
 * поэтому loader отдаёт пустой список. Когда репозиторий появится, достаточно подставить
 * `store._repo.queryTemplates({includeArchived: true})` — остальная структура стора готова.
 */
export const TemplateStore = signalStore(
    {providedIn: 'root'},
    withProps(() => ({
        _revisions: inject(DataRevisionStore),
    })),
    withRxResourceState({
        name: 'templates',
        eager: true,
        loader: () => of<TemplateSummary[]>([]),
    }),
    withEntityIndex({
        name: 'template',
        items: (store) => computed(() => store._templates() ?? []),
        selectId: (item: TemplateSummary) => item.id,
    }),
    withProps((store) => ({
        templates: computed(() => store._templates() ?? []),
        activeTemplates: computed(() =>
            (store._templates() ?? []).filter((item) => !item.archived),
        ),
        hasLoaded: computed(
            () => store._templates() !== undefined || !!store._templatesMeta.error(),
        ),
        isLoading: computed(() => store._templatesMeta.isLoading()),
        getById: store._getTemplateById,
        hasId: store._hasTemplateId,
    })),
    withHooks({
        onInit(store) {
            syncOnRevision(
                store._revisions,
                [DATA_DOMAIN.Template, DATA_DOMAIN.Exercise],
                () => store._reloadTemplates(),
            );
        },
    }),
);
