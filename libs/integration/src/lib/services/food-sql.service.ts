import {inject, Injectable} from '@angular/core';
import {todayLocal, toLocalDayKey} from '@simple-sport/shared';
import {map, Observable, switchMap} from 'rxjs';
import {CalorieRecord} from '../models/calorie.model';
import {NutritionRepository} from '../repositories';

const PLANNED_DAILY_CALORIES = 2200;

@Injectable({providedIn: 'root'})
export class FoodSqlService {
    private readonly nutrition = inject(NutritionRepository);

    getPlannedDailyCalories(): number {
        return PLANNED_DAILY_CALORIES;
    }

    listToday(): Observable<CalorieRecord[]> {
        return this.listByDay(todayLocal());
    }

    addEntry(name: string, calories: number): Observable<CalorieRecord> {
        const date = todayLocal();
        return this.nutrition.ensureDayGroup(date).pipe(
            switchMap((group) =>
                this.nutrition.saveEntry({
                    groupId: group.id,
                    name,
                    calories,
                    sortOrder: 0,
                }),
            ),
            map((entry) => ({
                id: entry.id,
                name: entry.name,
                calories: entry.calories,
                date,
            })),
        );
    }

    removeEntry(id: string): Observable<void> {
        return this.nutrition.deleteEntries([id]).pipe(map(() => undefined));
    }

    getDailySeries(
        days = 20,
    ): Observable<{dates: string[]; calories: number[]; planned: number[]}> {
        const range = dateRangeKeys(days);
        return this.nutrition.queryDay(range[0] ?? todayLocal()).pipe(
            switchMap(() => loadRange(this.nutrition, range)),
            map((caloriesByDate) => ({
                dates: range.map((day) => day.slice(5)),
                calories: range.map((day) => Math.round(caloriesByDate.get(day) ?? 0)),
                planned: range.map(() => PLANNED_DAILY_CALORIES),
            })),
        );
    }

    private listByDay(day: string): Observable<CalorieRecord[]> {
        return this.nutrition.queryDay(day).pipe(
            map((result) =>
                result.groups.flatMap((group) =>
                    group.entries.map((entry) => ({
                        id: entry.id,
                        name: entry.name,
                        calories: Math.round(entry.calories),
                        date: result.date,
                    })),
                ),
            ),
        );
    }
}

function loadRange(
    nutrition: NutritionRepository,
    range: string[],
): Observable<Map<string, number>> {
    return range.reduce(
        (acc, day) =>
            acc.pipe(
                switchMap((mapSoFar) =>
                    nutrition.queryDay(day).pipe(
                        map((result) => {
                            mapSoFar.set(day, result.totals.calories);
                            return mapSoFar;
                        }),
                    ),
                ),
            ),
        new Observable<Map<string, number>>((subscriber) => {
            subscriber.next(new Map());
            subscriber.complete();
        }),
    );
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
