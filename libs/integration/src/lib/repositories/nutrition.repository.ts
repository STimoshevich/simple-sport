import {inject, Injectable} from '@angular/core';
import {
    CategoryQuery,
    CategorySaveInput,
    createGuid,
    DATA_DOMAIN,
    DataRevisionStore,
    Dish,
    DishQuery,
    DishSaveInput,
    DishWithUsage,
    MealCategory,
    MealCategoryWithUsage,
    MealEntry,
    MealEntrySaveInput,
    MealEntrySnapshot,
    MealGroup,
    nowUtc,
    NutritionDay,
    sqlWhere,
    todayLocal,
} from '@simple-sport/shared';
import {map, Observable, of, switchMap, throwError} from 'rxjs';
import {SqliteRow, SqliteStorageService} from '../sqlite-storage.service';
import {
    asBool,
    asNumber,
    asOptionalNumber,
    asOptionalString,
    asString,
    cell,
} from '../sqlite.util';

@Injectable({providedIn: 'root'})
export class NutritionRepository {
    private readonly sqlite = inject(SqliteStorageService);
    private readonly revisions = inject(DataRevisionStore);

    queryDay(date: string): Observable<NutritionDay> {
        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT * FROM meal_group WHERE date = ? AND deleted = 0 ORDER BY sort_order`,
                    [date],
                ),
            ),
            switchMap((groups) =>
                this.sqlite
                    .query(
                        `SELECT e.*
             FROM meal_entry e
             JOIN meal_group g ON g.id = e.group_id
             WHERE g.date = ? AND e.deleted = 0 AND g.deleted = 0
             ORDER BY e.sort_order`,
                        [date],
                    )
                    .pipe(map((entries) => ({groups, entries}))),
            ),
            switchMap(({groups, entries}) =>
                this.sqlite
                    .query(
                        `SELECT * FROM nutrition_goal WHERE effective_from <= ? ORDER BY effective_from DESC LIMIT 1`,
                        [date],
                    )
                    .pipe(map((goal) => ({groups, entries, goal}))),
            ),
            map(({groups, entries, goal}) => {
                const mappedGroups = groups.map(mapGroup);
                const mappedEntries = entries.map(mapEntry);
                const byGroup = new Map<string, MealEntry[]>();

                for (const entry of mappedEntries) {
                    const list = byGroup.get(entry.groupId) ?? [];
                    list.push(entry);
                    byGroup.set(entry.groupId, list);
                }

                const withEntries = mappedGroups.map((group) => ({
                    ...group,
                    entries: byGroup.get(group.id) ?? [],
                }));
                const totals = withEntries
                    .flatMap((group) => group.entries)
                    .reduce(
                        (acc, entry) => ({
                            calories: acc.calories + entry.calories,
                            protein: acc.protein + entry.protein,
                            fat: acc.fat + entry.fat,
                            carbs: acc.carbs + entry.carbs,
                        }),
                        {calories: 0, protein: 0, fat: 0, carbs: 0},
                    );
                return {
                    date,
                    groups: withEntries,
                    totals,
                    goal: goal[0]
                        ? {
                              id: asString(cell(goal[0], 'id')),
                              effectiveFrom: asString(cell(goal[0], 'effective_from')),
                              calories: asNumber(cell(goal[0], 'calories')),
                              protein: asNumber(cell(goal[0], 'protein')),
                              fat: asNumber(cell(goal[0], 'fat')),
                              carbs: asNumber(cell(goal[0], 'carbs')),
                              createdAt: asString(cell(goal[0], 'created_at')),
                          }
                        : undefined,
                };
            }),
        );
    }

    saveEntry(input: MealEntrySaveInput): Observable<MealEntry> {
        const now = nowUtc();
        return this.sqlite
            .transaction((tx) => {
                const id = input.id ?? createGuid();
                const write = input.id
                    ? tx.run(
                          `UPDATE meal_entry SET
                 group_id = ?, dish_id = ?, name = ?, grams = ?, calories = ?, protein = ?, fat = ?, carbs = ?,
                 comment = ?, sort_order = ?, manually_edited = ?, deleted = 0
               WHERE id = ?`,
                          [
                              input.groupId,
                              input.dishId ?? null,
                              input.name,
                              input.grams ?? null,
                              input.calories,
                              input.protein ?? 0,
                              input.fat ?? 0,
                              input.carbs ?? 0,
                              input.comment ?? null,
                              input.sortOrder ?? 0,
                              input.manuallyEdited ? 1 : 0,
                              id,
                          ],
                      )
                    : tx.run(
                          `INSERT INTO meal_entry (
                 id, group_id, dish_id, name, grams, calories, protein, fat, carbs,
                 comment, sort_order, manually_edited, deleted, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
                          [
                              id,
                              input.groupId,
                              input.dishId ?? null,
                              input.name,
                              input.grams ?? null,
                              input.calories,
                              input.protein ?? 0,
                              input.fat ?? 0,
                              input.carbs ?? 0,
                              input.comment ?? null,
                              input.sortOrder ?? 0,
                              input.manuallyEdited ? 1 : 0,
                              now,
                          ],
                      );
                return write.pipe(
                    switchMap(() =>
                        tx.query('SELECT * FROM meal_entry WHERE id = ?', [id]),
                    ),
                    map((rows) => mapEntry(rows[0] ?? {})),
                );
            })
            .pipe(
                map((entry) => {
                    this.revisions.bump([DATA_DOMAIN.MealEntry]);
                    return entry;
                }),
            );
    }

    ensureDayGroup(date = todayLocal()): Observable<MealGroup> {
        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT * FROM meal_group WHERE date = ? AND deleted = 0 ORDER BY sort_order LIMIT 1`,
                    [date],
                ),
            ),
            switchMap((rows) => {
                if (rows[0]) {
                    return of(mapGroup(rows[0]));
                }

                const id = createGuid();
                const now = nowUtc();
                return this.sqlite
                    .transaction((tx) =>
                        tx
                            .run(
                                `INSERT INTO meal_group (id, date, category_id, name, sort_order, deleted, created_at)
                 VALUES (?, ?, NULL, NULL, 0, 0, ?)`,
                                [id, date, now],
                            )
                            .pipe(map(() => ({id, date, sortOrder: 0, createdAt: now}))),
                    )
                    .pipe(
                        map((group) => {
                            this.revisions.bump([DATA_DOMAIN.MealGroup]);
                            return group;
                        }),
                    );
            }),
        );
    }

    deleteEntries(ids: string[]): Observable<MealEntrySnapshot[]> {
        if (!ids.length) {
            return of([]);
        }

        const placeholders = ids.map(() => '?').join(', ');
        return this.sqlite
            .transaction((tx) =>
                tx
                    .query(`SELECT * FROM meal_entry WHERE id IN (${placeholders})`, ids)
                    .pipe(
                        switchMap((rows) =>
                            tx
                                .run(
                                    `UPDATE meal_entry SET deleted = 1 WHERE id IN (${placeholders})`,
                                    ids,
                                )
                                .pipe(map(() => rows.map(mapEntrySnapshot))),
                        ),
                    ),
            )
            .pipe(
                map((snapshots) => {
                    this.revisions.bump([DATA_DOMAIN.MealEntry]);
                    return snapshots;
                }),
            );
    }

    queryDishes(q: DishQuery = {}): Observable<DishWithUsage[]> {
        const where = sqlWhere()
            .add('d.deleted = 0')
            .addIf(!q.includeArchived, 'd.archived = 0')
            .addIf(q.search?.trim(), 'd.name LIKE ?', `%${q.search?.trim() ?? ''}%`);

        const usageSelect = q.withUsage
            ? `, (SELECT COUNT(*) FROM meal_entry me
            WHERE me.dish_id = d.id AND me.deleted = 0) AS usage_count
         , (SELECT MAX(g.date) FROM meal_entry me
            JOIN meal_group g ON g.id = me.group_id
            WHERE me.dish_id = d.id AND me.deleted = 0 AND g.deleted = 0) AS last_used_at`
            : ', 0 AS usage_count, NULL AS last_used_at';

        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT d.* ${usageSelect}
           FROM dish d
           WHERE ${where.sql}
           ORDER BY d.name COLLATE NOCASE`,
                    where.params,
                ),
            ),
            map((rows) => rows.map(mapDishWithUsage)),
        );
    }

    saveDish(input: DishSaveInput): Observable<Dish> {
        const now = nowUtc();
        return this.sqlite
            .transaction((tx) => {
                if (input.id) {
                    return tx
                        .run(
                            `UPDATE dish
               SET name = ?, comment = ?, calories_per_100g = ?, protein_per_100g = ?,
                   fat_per_100g = ?, carbs_per_100g = ?, updated_at = ?
               WHERE id = ? AND deleted = 0`,
                            [
                                input.name,
                                input.comment ?? null,
                                input.caloriesPer100g,
                                input.proteinPer100g ?? 0,
                                input.fatPer100g ?? 0,
                                input.carbsPer100g ?? 0,
                                now,
                                input.id,
                            ],
                        )
                        .pipe(
                            switchMap(() =>
                                tx.query('SELECT * FROM dish WHERE id = ?', [input.id!]),
                            ),
                            map((rows) => mapDish(rows[0] ?? {})),
                        );
                }

                const id = createGuid();
                return tx
                    .run(
                        `INSERT INTO dish (id, name, comment, calories_per_100g, protein_per_100g,
                           fat_per_100g, carbs_per_100g, archived, deleted, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
                        [
                            id,
                            input.name,
                            input.comment ?? null,
                            input.caloriesPer100g,
                            input.proteinPer100g ?? 0,
                            input.fatPer100g ?? 0,
                            input.carbsPer100g ?? 0,
                            now,
                            now,
                        ],
                    )
                    .pipe(
                        switchMap(() =>
                            tx.query('SELECT * FROM dish WHERE id = ?', [id]),
                        ),
                        map((rows) => mapDish(rows[0] ?? {})),
                    );
            })
            .pipe(
                map((dish) => {
                    this.revisions.bump([DATA_DOMAIN.Dish]);
                    return dish;
                }),
            );
    }

    setDishArchived(ids: string[], archived: boolean): Observable<void> {
        if (!ids.length) {
            return this.sqlite.init().pipe(map(() => undefined));
        }

        const placeholders = ids.map(() => '?').join(', ');
        return this.sqlite
            .transaction((tx) =>
                tx.run(
                    `UPDATE dish SET archived = ?, updated_at = ? WHERE id IN (${placeholders})`,
                    [archived ? 1 : 0, nowUtc(), ...ids],
                ),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.Dish]);
                }),
            );
    }

    deleteDish(id: string): Observable<void> {
        return this.sqlite
            .transaction((tx) =>
                tx
                    .query(
                        `SELECT COUNT(*) AS n FROM meal_entry WHERE dish_id = ? AND deleted = 0`,
                        [id],
                    )
                    .pipe(
                        switchMap((rows) => {
                            if (asNumber(cell(rows[0] ?? {}, 'n')) > 0) {
                                return throwError(() => new Error('Dish is in use'));
                            }

                            return tx.run(
                                'UPDATE dish SET deleted = 1, updated_at = ? WHERE id = ?',
                                [nowUtc(), id],
                            );
                        }),
                    ),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.Dish]);
                }),
            );
    }

    queryCategories(q: CategoryQuery = {}): Observable<MealCategoryWithUsage[]> {
        const where = sqlWhere()
            .add('c.deleted = 0')
            .addIf(!q.includeArchived, 'c.archived = 0')
            .addIf(q.search?.trim(), 'c.name LIKE ?', `%${q.search?.trim() ?? ''}%`);

        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT c.*, (SELECT COUNT(*) FROM meal_group g
            WHERE g.category_id = c.id AND g.deleted = 0) AS usage_count
           FROM meal_category c
           WHERE ${where.sql}
           ORDER BY c.name COLLATE NOCASE`,
                    where.params,
                ),
            ),
            map((rows) => rows.map(mapCategoryWithUsage)),
        );
    }

    saveCategory(input: CategorySaveInput): Observable<MealCategory> {
        const now = nowUtc();
        return this.sqlite
            .transaction((tx) => {
                if (input.id) {
                    return tx
                        .run(
                            `UPDATE meal_category
               SET name = ?, updated_at = ?
               WHERE id = ? AND deleted = 0`,
                            [input.name, now, input.id],
                        )
                        .pipe(
                            switchMap(() =>
                                tx.query('SELECT * FROM meal_category WHERE id = ?', [
                                    input.id!,
                                ]),
                            ),
                            map((rows) => mapCategory(rows[0] ?? {})),
                        );
                }

                const id = createGuid();
                return tx
                    .run(
                        `INSERT INTO meal_category (id, name, archived, deleted, created_at, updated_at)
             VALUES (?, ?, 0, 0, ?, ?)`,
                        [id, input.name, now, now],
                    )
                    .pipe(
                        switchMap(() =>
                            tx.query('SELECT * FROM meal_category WHERE id = ?', [id]),
                        ),
                        map((rows) => mapCategory(rows[0] ?? {})),
                    );
            })
            .pipe(
                map((category) => {
                    this.revisions.bump([
                        DATA_DOMAIN.MealCategory,
                        DATA_DOMAIN.MealGroup,
                    ]);
                    return category;
                }),
            );
    }

    deleteCategory(id: string, mode: 'archive' | 'delete'): Observable<void> {
        if (mode === 'archive') {
            return this.sqlite
                .transaction((tx) =>
                    tx.run(
                        `UPDATE meal_category
                SET archived = 1, updated_at = ?
                WHERE id = ? AND deleted = 0`,
                        [nowUtc(), id],
                    ),
                )
                .pipe(
                    map(() => {
                        this.revisions.bump([
                            DATA_DOMAIN.MealCategory,
                            DATA_DOMAIN.MealGroup,
                        ]);
                    }),
                );
        }

        return this.sqlite
            .transaction((tx) =>
                tx
                    .query(
                        `SELECT COUNT(*) AS n FROM meal_group WHERE category_id = ? AND deleted = 0`,
                        [id],
                    )
                    .pipe(
                        switchMap((rows) => {
                            if (asNumber(cell(rows[0] ?? {}, 'n')) > 0) {
                                return throwError(() => new Error('Category is in use'));
                            }

                            return tx.run(
                                'UPDATE meal_category SET deleted = 1, updated_at = ? WHERE id = ?',
                                [nowUtc(), id],
                            );
                        }),
                    ),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([
                        DATA_DOMAIN.MealCategory,
                        DATA_DOMAIN.MealGroup,
                    ]);
                }),
            );
    }
}

function mapGroup(row: SqliteRow): MealGroup {
    return {
        id: asString(cell(row, 'id')),
        date: asString(cell(row, 'date')),
        categoryId: asOptionalString(cell(row, 'category_id')),
        name: asOptionalString(cell(row, 'name')),
        sortOrder: asNumber(cell(row, 'sort_order')),
        createdAt: asString(cell(row, 'created_at')),
    };
}

function mapEntry(row: SqliteRow): MealEntry {
    return {
        id: asString(cell(row, 'id')),
        groupId: asString(cell(row, 'group_id')),
        dishId: asOptionalString(cell(row, 'dish_id')),
        name: asString(cell(row, 'name')),
        grams: asOptionalNumber(cell(row, 'grams')),
        calories: asNumber(cell(row, 'calories')),
        protein: asNumber(cell(row, 'protein')),
        fat: asNumber(cell(row, 'fat')),
        carbs: asNumber(cell(row, 'carbs')),
        comment: asOptionalString(cell(row, 'comment')),
        sortOrder: asNumber(cell(row, 'sort_order')),
        manuallyEdited: asBool(cell(row, 'manually_edited')),
        createdAt: asString(cell(row, 'created_at')),
    };
}

function mapEntrySnapshot(row: SqliteRow): MealEntrySnapshot {
    const entry = mapEntry(row);
    return {
        id: entry.id,
        groupId: entry.groupId,
        dishId: entry.dishId,
        name: entry.name,
        grams: entry.grams,
        calories: entry.calories,
        protein: entry.protein,
        fat: entry.fat,
        carbs: entry.carbs,
        comment: entry.comment,
        sortOrder: entry.sortOrder,
        manuallyEdited: entry.manuallyEdited,
    };
}

function mapDish(row: SqliteRow): Dish {
    return {
        id: asString(cell(row, 'id')),
        name: asString(cell(row, 'name')),
        comment: asOptionalString(cell(row, 'comment')),
        caloriesPer100g: asNumber(cell(row, 'calories_per_100g')),
        proteinPer100g: asNumber(cell(row, 'protein_per_100g')),
        fatPer100g: asNumber(cell(row, 'fat_per_100g')),
        carbsPer100g: asNumber(cell(row, 'carbs_per_100g')),
        archived: asBool(cell(row, 'archived')),
        createdAt: asString(cell(row, 'created_at')),
        updatedAt: asString(cell(row, 'updated_at')),
    };
}

function mapDishWithUsage(row: SqliteRow): DishWithUsage {
    return {
        ...mapDish(row),
        usageCount: asNumber(cell(row, 'usage_count'), 0),
        lastUsedAt: asOptionalString(cell(row, 'last_used_at')),
    };
}

function mapCategory(row: SqliteRow): MealCategory {
    return {
        id: asString(cell(row, 'id')),
        name: asString(cell(row, 'name')),
        archived: asBool(cell(row, 'archived')),
        createdAt: asString(cell(row, 'created_at')),
        updatedAt: asString(cell(row, 'updated_at')),
    };
}

function mapCategoryWithUsage(row: SqliteRow): MealCategoryWithUsage {
    return {
        ...mapCategory(row),
        usageCount: asNumber(cell(row, 'usage_count'), 0),
    };
}
