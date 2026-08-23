import {Guid} from './guid';

export interface Dish {
    id: Guid;
    name: string;
    comment?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
    carbsPer100g: number;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DishWithUsage extends Dish {
    usageCount: number;
    lastUsedAt?: string;
}

export interface DishSaveInput {
    id?: Guid;
    name: string;
    comment?: string;
    caloriesPer100g: number;
    proteinPer100g?: number;
    fatPer100g?: number;
    carbsPer100g?: number;
}

export interface DishQuery {
    search?: string;
    includeArchived?: boolean;
    withUsage?: boolean;
}

export interface MealCategory {
    id: Guid;
    name: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MealCategoryWithUsage extends MealCategory {
    usageCount: number;
}

export interface CategoryQuery {
    search?: string;
    includeArchived?: boolean;
}

export interface CategorySaveInput {
    id?: Guid;
    name: string;
}

export interface MealGroup {
    id: Guid;
    date: string;
    categoryId?: Guid;
    name?: string;
    sortOrder: number;
    createdAt: string;
}

export interface MealGroupSaveInput {
    id?: Guid;
    date: string;
    categoryId?: Guid | null;
    name?: string | null;
    sortOrder?: number;
}

export interface MealEntry {
    id: Guid;
    groupId: Guid;
    dishId?: Guid;
    name: string;
    grams?: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    comment?: string;
    sortOrder: number;
    manuallyEdited: boolean;
    createdAt: string;
}

export interface MealEntrySaveInput {
    id?: Guid;
    groupId: Guid;
    dishId?: Guid | null;
    newDish?: DishSaveInput;
    name: string;
    grams?: number;
    calories: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    comment?: string;
    sortOrder?: number;
    manuallyEdited?: boolean;
}

export interface MealEntrySnapshot {
    id: Guid;
    groupId: Guid;
    dishId?: Guid;
    name: string;
    grams?: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    comment?: string;
    sortOrder: number;
    manuallyEdited: boolean;
}

export interface NutritionGoalVersion {
    id: Guid;
    effectiveFrom: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    createdAt: string;
}

export interface NutritionGoalInput {
    id?: Guid;
    effectiveFrom: string;
    calories: number;
    protein?: number;
    fat?: number;
    carbs?: number;
}

export interface NutritionDay {
    date: string;
    groups: Array<MealGroup & {entries: MealEntry[]}>;
    totals: {calories: number; protein: number; fat: number; carbs: number};
    goal?: NutritionGoalVersion;
}

export interface SuggestQuery {
    query: string;
    kind?: 'dish' | 'category';
    limit?: number;
}

export interface Suggestion {
    kind: 'dish' | 'category' | 'adhoc';
    id?: Guid;
    name: string;
}
