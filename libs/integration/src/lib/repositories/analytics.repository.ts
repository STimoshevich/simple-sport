import {
    AnalyticsQuery,
    BreakdownQuery,
    BreakdownSlice,
    CardioPoint,
    ExerciseOption,
    NutritionPoint,
    StrengthPoint,
} from '@simple-sport/shared';
import {Observable} from 'rxjs';

/** Implemented with Epic 9 (Stage 3). Signatures are the Stage 1 contract. */
export interface AnalyticsRepository {
    strengthSeries(q: AnalyticsQuery): Observable<StrengthPoint[]>;
    cardioSeries(q: AnalyticsQuery): Observable<CardioPoint[]>;
    nutritionSeries(q: AnalyticsQuery): Observable<NutritionPoint[]>;
    nutritionBreakdown(q: BreakdownQuery): Observable<BreakdownSlice[]>;
    exerciseOptions(q: AnalyticsQuery): Observable<ExerciseOption[]>;
}
