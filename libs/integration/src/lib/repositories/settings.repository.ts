import {inject, Injectable} from '@angular/core';
import {
    AppSettings,
    AppTheme,
    createGuid,
    DATA_DOMAIN,
    DataRevisionStore,
    DEFAULT_APP_SETTINGS,
    DistanceUnit,
    EnergyUnit,
    nowUtc,
    NutritionGoalInput,
    NutritionGoalVersion,
    SETTINGS_KEYS,
    WeightUnit,
} from '@simple-sport/shared';
import {forkJoin, map, Observable, of, switchMap} from 'rxjs';
import {SqliteStorageService, SqliteTransaction} from '../sqlite-storage.service';
import {asNumber, asString, cell} from '../sqlite.util';

@Injectable({providedIn: 'root'})
export class SettingsRepository {
    private readonly sqlite = inject(SqliteStorageService);
    private readonly revisions = inject(DataRevisionStore);

    getSettings(): Observable<AppSettings> {
        return this.sqlite.init().pipe(
            switchMap(() => this.sqlite.query('SELECT key, value FROM app_kv')),
            map((rows) => {
                const kv = new Map<string, string>();

                for (const row of rows) {
                    const key = asString(cell(row, 'key'));
                    const value = asString(cell(row, 'value'));
                    kv.set(key, value);
                }

                return hydrateSettings(kv);
            }),
        );
    }

    patch(partial: Partial<AppSettings>): Observable<void> {
        return this.sqlite
            .transaction((tx) => this.writeSettings(tx, partial))
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.Settings]);
                }),
            );
    }

    listGoals(): Observable<NutritionGoalVersion[]> {
        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT id, effective_from, calories, protein, fat, carbs, created_at
           FROM nutrition_goal
           ORDER BY effective_from DESC`,
                ),
            ),
            map((rows) => rows.map(mapGoal)),
        );
    }

    saveGoal(input: NutritionGoalInput): Observable<void> {
        const now = nowUtc();
        return this.sqlite
            .transaction((tx) =>
                tx
                    .query('SELECT id FROM nutrition_goal WHERE effective_from = ?', [
                        input.effectiveFrom,
                    ])
                    .pipe(
                        switchMap((rows) => {
                            const existingId =
                                input.id ??
                                (rows[0] ? asString(cell(rows[0], 'id')) : undefined);

                            if (existingId) {
                                return tx.run(
                                    `UPDATE nutrition_goal
                 SET calories = ?, protein = ?, fat = ?, carbs = ?
                 WHERE id = ?`,
                                    [
                                        input.calories,
                                        input.protein ?? 0,
                                        input.fat ?? 0,
                                        input.carbs ?? 0,
                                        existingId,
                                    ],
                                );
                            }

                            return tx.run(
                                `INSERT INTO nutrition_goal (id, effective_from, calories, protein, fat, carbs, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    createGuid(),
                                    input.effectiveFrom,
                                    input.calories,
                                    input.protein ?? 0,
                                    input.fat ?? 0,
                                    input.carbs ?? 0,
                                    now,
                                ],
                            );
                        }),
                    ),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.NutritionGoal]);
                }),
            );
    }

    deleteGoal(id: string): Observable<void> {
        return this.sqlite
            .transaction((tx) => tx.run('DELETE FROM nutrition_goal WHERE id = ?', [id]))
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.NutritionGoal]);
                }),
            );
    }

    clearDomainData(): Observable<void> {
        const tables = [
            'meal_entry',
            'meal_group',
            'nutrition_goal',
            'training_set',
            'training_exercise',
            'training',
            'day_note',
            'template_set',
            'template_exercise',
            'training_template',
            'dish',
            'meal_category',
            'exercise',
        ];
        return this.sqlite
            .transaction((tx) =>
                forkJoin(tables.map((table) => tx.execute(`DELETE FROM ${table}`))).pipe(
                    map(() => undefined),
                ),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([
                        DATA_DOMAIN.Exercise,
                        DATA_DOMAIN.Training,
                        DATA_DOMAIN.TrainingSet,
                        DATA_DOMAIN.DayNote,
                        DATA_DOMAIN.Template,
                        DATA_DOMAIN.Dish,
                        DATA_DOMAIN.MealCategory,
                        DATA_DOMAIN.MealGroup,
                        DATA_DOMAIN.MealEntry,
                        DATA_DOMAIN.NutritionGoal,
                    ]);
                }),
            );
    }

    private writeSettings(
        tx: SqliteTransaction,
        partial: Partial<AppSettings>,
    ): Observable<void> {
        const writes: Observable<void>[] = [];

        if (partial.language) {
            writes.push(
                tx.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
                    SETTINGS_KEYS.Language,
                    partial.language,
                ]),
            );
        }

        if (partial.theme) {
            writes.push(
                tx.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
                    SETTINGS_KEYS.Theme,
                    partial.theme,
                ]),
            );
        }

        if (partial.units?.weight) {
            writes.push(
                tx.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
                    SETTINGS_KEYS.Weight,
                    partial.units.weight,
                ]),
            );
        }

        if (partial.units?.distance) {
            writes.push(
                tx.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
                    SETTINGS_KEYS.Distance,
                    partial.units.distance,
                ]),
            );
        }

        if (partial.units?.energy) {
            writes.push(
                tx.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
                    SETTINGS_KEYS.Energy,
                    partial.units.energy,
                ]),
            );
        }

        if (partial.uiFeedFilters !== undefined) {
            writes.push(
                tx.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
                    SETTINGS_KEYS.FeedFilters,
                    partial.uiFeedFilters,
                ]),
            );
        }

        return writes.length
            ? forkJoin(writes).pipe(map(() => undefined))
            : of(undefined);
    }
}

function hydrateSettings(kv: Map<string, string>): AppSettings {
    const legacyUnits = parseLegacyUnits(kv.get(SETTINGS_KEYS.LegacyUnits));
    const legacyTheme = kv.get(SETTINGS_KEYS.LegacyTheme);
    return {
        language:
            kv.get(SETTINGS_KEYS.Language) === 'en'
                ? 'en'
                : DEFAULT_APP_SETTINGS.language,
        theme: readTheme(kv.get(SETTINGS_KEYS.Theme), legacyTheme),
        units: {
            weight:
                (kv.get(SETTINGS_KEYS.Weight) as WeightUnit | undefined) ??
                legacyUnits.weight,
            distance:
                (kv.get(SETTINGS_KEYS.Distance) as DistanceUnit | undefined) ??
                legacyUnits.distance,
            energy:
                (kv.get(SETTINGS_KEYS.Energy) as EnergyUnit | undefined) ??
                DEFAULT_APP_SETTINGS.units.energy,
        },
        uiFeedFilters: kv.get(SETTINGS_KEYS.FeedFilters),
    };
}

function readTheme(value: string | undefined, legacy: string | undefined): AppTheme {
    if (value === 'light' || value === 'dark' || value === 'system') {
        return value;
    }

    if (legacy === 'light' || legacy === 'dark') {
        return legacy;
    }

    return 'dark';
}

function parseLegacyUnits(raw: string | undefined): {
    weight: WeightUnit;
    distance: DistanceUnit;
} {
    if (!raw) {
        return DEFAULT_APP_SETTINGS.units;
    }

    try {
        const parsed = JSON.parse(raw) as {weight?: string; distance?: string};
        return {
            weight: parsed.weight === 'lb' ? 'lb' : 'kg',
            distance:
                parsed.distance === 'mi' ? 'mi' : parsed.distance === 'm' ? 'm' : 'km',
        };
    } catch {
        return DEFAULT_APP_SETTINGS.units;
    }
}

function mapGoal(row: Record<string, unknown>): NutritionGoalVersion {
    return {
        id: asString(cell(row, 'id')),
        effectiveFrom: asString(cell(row, 'effective_from')),
        calories: asNumber(cell(row, 'calories')),
        protein: asNumber(cell(row, 'protein')),
        fat: asNumber(cell(row, 'fat')),
        carbs: asNumber(cell(row, 'carbs')),
        createdAt: asString(cell(row, 'created_at')),
    };
}
