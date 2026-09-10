import {Guid} from './guid';

export interface AnalyticsQuery {
    from: string;
    to: string;
    exerciseId?: Guid;
    bucket: 'day' | 'week';
}

export interface StrengthPoint {
    date: string;
    tonnage: number;
    reps: number;
    sets: number;
}

export interface CardioPoint {
    date: string;
    distance: number;
    duration: number;
    sets: number;
}

export interface NutritionPoint {
    date: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    goalCalories?: number;
}

export interface BreakdownQuery extends AnalyticsQuery {
    groupBy: 'dish' | 'category';
    metric: 'calories' | 'count';
}

export interface BreakdownSlice {
    key: string;
    label: string;
    value: number;
    count: number;
}

export interface ExerciseOption {
    id: Guid;
    name: string;
    type: 'strength' | 'cardio';
}
