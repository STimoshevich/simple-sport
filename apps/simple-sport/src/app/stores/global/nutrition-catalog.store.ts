import {computed, inject} from '@angular/core';
import {signalStore, withHooks, withMethods, withProps} from '@ngrx/signals';
import {NutritionCatalogService} from '@simple-sport/integration';
import {
    CategorySaveInput,
    DATA_DOMAIN,
    DataRevisionStore,
    Dish,
    DishSaveInput,
    DishWithUsage,
    MealCategory,
    MealCategoryWithUsage,
    withEntityIndex,
    withRxResourceState,
} from '@simple-sport/shared';
import {EMPTY, Observable} from 'rxjs';
import {syncOnRevision} from '../revision.util';

interface NamedItem {
    id: string;
    name: string;
}

function isNameTaken(items: readonly NamedItem[], name: string, id?: string): boolean {
    const normalized = name.trim().toLowerCase();

    if (!normalized) {
        return false;
    }

    return items.some(
        (item) => item.id !== id && item.name.trim().toLowerCase() === normalized,
    );
}

function findByName<T extends NamedItem>(
    items: readonly T[],
    name: string,
): T | undefined {
    const normalized = name.trim().toLowerCase();

    if (!normalized) {
        return undefined;
    }

    return items.find((item) => item.name.trim().toLowerCase() === normalized);
}

/**
 * Каталог блюд и категорий приёмов пищи целиком в памяти.
 *
 * Один стор на оба справочника (docs/BUSINESS-PLAN.md §8.3): слушает домены
 * `Dish` и `MealCategory` шины ревизий, записи идут через
 * `NutritionCatalogService`.
 */
export const NutritionCatalogStore = signalStore(
    {providedIn: 'root'},
    withProps(() => ({
        _api: inject(NutritionCatalogService),
        _revisions: inject(DataRevisionStore),
    })),
    withRxResourceState({
        name: 'dishes',
        eager: true,
        loader: ({store}) =>
            store._api.queryDishes({includeArchived: true, withUsage: true}),
    }),
    withRxResourceState({
        name: 'categories',
        eager: true,
        loader: ({store}) => store._api.queryCategories({includeArchived: true}),
    }),
    withEntityIndex({
        name: 'dish',
        items: (store) => computed(() => store._dishes() ?? []),
        selectId: (item: DishWithUsage) => item.id,
    }),
    withEntityIndex({
        name: 'category',
        items: (store) => computed(() => store._categories() ?? []),
        selectId: (item: MealCategoryWithUsage) => item.id,
    }),
    withProps((store) => ({
        dishes: computed(() => store._dishes() ?? []),
        activeDishes: computed(() =>
            (store._dishes() ?? []).filter((item) => !item.archived),
        ),
        getDishById: store._getDishById,
        hasDishId: store._hasDishId,
        categories: computed(() => store._categories() ?? []),
        activeCategories: computed(() =>
            (store._categories() ?? []).filter((item) => !item.archived),
        ),
        getCategoryById: store._getCategoryById,
        hasCategoryId: store._hasCategoryId,
        hasLoaded: computed(
            () =>
                (store._dishes() !== undefined && store._categories() !== undefined) ||
                !!store._dishesMeta.error() ||
                !!store._categoriesMeta.error(),
        ),
        isLoading: computed(
            () => store._dishesMeta.isLoading() || store._categoriesMeta.isLoading(),
        ),
    })),
    withMethods((store) => ({
        dishNameTaken(name: string, id?: string): boolean {
            return isNameTaken(store.dishes(), name, id);
        },
        findDishByName(name: string): DishWithUsage | undefined {
            return findByName(store.dishes(), name);
        },
        saveDish(input: DishSaveInput): Observable<Dish> {
            const name = input.name.trim();

            if (!name || isNameTaken(store.dishes(), name, input.id)) {
                return EMPTY;
            }

            return store._api.saveDish({...input, name});
        },
        archiveDish(id: string): Observable<void> {
            return store._api.setDishArchived([id], true);
        },
        restoreDish(id: string): Observable<void> {
            return store._api.setDishArchived([id], false);
        },
        deleteDish(id: string): Observable<void> {
            return store._api.deleteDish(id);
        },
        categoryNameTaken(name: string, id?: string): boolean {
            return isNameTaken(store.categories(), name, id);
        },
        findCategoryByName(name: string): MealCategoryWithUsage | undefined {
            return findByName(store.categories(), name);
        },
        saveCategory(input: CategorySaveInput): Observable<MealCategory> {
            const name = input.name.trim();

            if (!name || isNameTaken(store.categories(), name, input.id)) {
                return EMPTY;
            }

            return store._api.saveCategory({...input, name});
        },
        archiveCategory(id: string): Observable<void> {
            return store._api.deleteCategory(id, 'archive');
        },
        removeCategory(id: string): Observable<void> {
            return store._api.deleteCategory(id, 'delete');
        },
    })),
    withHooks({
        onInit(store) {
            syncOnRevision(store._revisions, [DATA_DOMAIN.Dish], () =>
                store._reloadDishes(),
            );
            syncOnRevision(store._revisions, [DATA_DOMAIN.MealCategory], () =>
                store._reloadCategories(),
            );
        },
    }),
);
