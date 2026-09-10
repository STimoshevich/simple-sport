import {inject, Injectable} from '@angular/core';
import {
    CategoryQuery,
    CategorySaveInput,
    Dish,
    DishQuery,
    DishSaveInput,
    DishWithUsage,
    MealCategory,
    MealCategoryWithUsage,
} from '@simple-sport/shared';
import {Observable} from 'rxjs';
import {NutritionRepository} from '../repositories';

/**
 * Каталог блюд и категорий приёмов пищи — публичный API поверх
 * {@link NutritionRepository}.
 *
 * Репозитории — внутренняя деталь lib: каталог-сторы и страницы
 * работают только с этим сервисом.
 */
@Injectable({providedIn: 'root'})
export class NutritionCatalogService {
    private readonly nutrition = inject(NutritionRepository);

    queryDishes(q: DishQuery = {}): Observable<DishWithUsage[]> {
        return this.nutrition.queryDishes(q);
    }

    queryCategories(q: CategoryQuery = {}): Observable<MealCategoryWithUsage[]> {
        return this.nutrition.queryCategories(q);
    }

    saveDish(input: DishSaveInput): Observable<Dish> {
        return this.nutrition.saveDish(input);
    }

    setDishArchived(ids: string[], archived: boolean): Observable<void> {
        return this.nutrition.setDishArchived(ids, archived);
    }

    deleteDish(id: string): Observable<void> {
        return this.nutrition.deleteDish(id);
    }

    saveCategory(input: CategorySaveInput): Observable<MealCategory> {
        return this.nutrition.saveCategory(input);
    }

    deleteCategory(id: string, mode: 'archive' | 'delete'): Observable<void> {
        return this.nutrition.deleteCategory(id, mode);
    }
}
