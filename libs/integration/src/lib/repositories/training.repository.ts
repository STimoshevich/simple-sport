import {inject, Injectable} from '@angular/core';
import {
    createGuid,
    DATA_DOMAIN,
    DataRevisionStore,
    DayNote,
    Guid,
    nowUtc,
    SetsDoneInput,
    sqlWhere,
    TrainingFull,
    TrainingQuery,
    TrainingSaveInput,
    TrainingSetSnapshot,
    TrainingSort,
    TrainingSortField,
    TrainingSummary,
} from '@simple-sport/shared';
import {forkJoin, map, Observable, of, switchMap} from 'rxjs';
import {
    SqliteRow,
    SqliteStorageService,
    SqliteTransaction,
} from '../sqlite-storage.service';
import {
    asBool,
    asNumber,
    asOptionalNumber,
    asOptionalString,
    asString,
    cell,
} from '../sqlite.util';

@Injectable({providedIn: 'root'})
export class TrainingRepository {
    private readonly sqlite = inject(SqliteStorageService);
    private readonly revisions = inject(DataRevisionStore);

    queryDateBounds(): Observable<{minDate?: string; maxDate?: string}> {
        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT MIN(date) AS min_date, MAX(date) AS max_date FROM training WHERE deleted = 0`,
                ),
            ),
            map((rows) => ({
                minDate: asOptionalString(cell(rows[0] ?? {}, 'min_date')),
                maxDate: asOptionalString(cell(rows[0] ?? {}, 'max_date')),
            })),
        );
    }

    // queryDays(q: TrainingQuery): Observable<PagedResult<TrainingDay>> {
    //     const datesWhere = sqlWhere().add('t.deleted = 0');
    //     datesWhere.addIf(q.dateFrom, 't.date >= ?', q.dateFrom ?? '');
    //     datesWhere.addIf(q.dateTo, 't.date <= ?', q.dateTo ?? '');
    //     datesWhere.addIn('t.id', q.trainingIds);
    //     datesWhere.addIf(q.templateId, 't.template_id = ?', q.templateId ?? '');
    //
    //     const offset = q.page?.offset ?? 0;
    //     const limit = q.page?.limit ?? 20;
    //     // Направление дней ленты берём из критерия date (по умолчанию — свежие сверху)
    //     const dayDirection =
    //         q.orderBy?.find((sort) => sort.field === 'date')?.direction === 'asc'
    //             ? 'ASC'
    //             : 'DESC';
    //
    //     return this.sqlite.init().pipe(
    //         switchMap(() =>
    //             this.sqlite
    //                 .query(
    //                     `SELECT COUNT(*) AS total FROM (SELECT t.date FROM training t WHERE ${datesWhere.sql} GROUP BY t.date)`,
    //                     datesWhere.params,
    //                 )
    //                 .pipe(
    //                     switchMap((countRows) =>
    //                         this.sqlite
    //                             .query(
    //                                 `SELECT t.date AS date
    //            FROM training t
    //            WHERE ${datesWhere.sql}
    //            GROUP BY t.date
    //            ORDER BY t.date ${dayDirection}
    //            LIMIT ? OFFSET ?`,
    //                                 [...datesWhere.params, limit, offset],
    //                             )
    //                             .pipe(
    //                                 map((dateRows) => ({
    //                                     dateRows,
    //                                     totalCount: asNumber(
    //                                         cell(countRows[0] ?? {}, 'total'),
    //                                         0,
    //                                     ),
    //                                 })),
    //                             ),
    //                     ),
    //                 ),
    //         ),
    //         switchMap(({dateRows, totalCount}) => {
    //             const dates = dateRows
    //                 .map((row) => asString(cell(row, 'date')))
    //                 .filter(Boolean);
    //
    //             if (!dates.length) {
    //                 return of({items: [] as TrainingDay[], totalCount: 0});
    //             }
    //
    //             return forkJoin({
    //                 trainings: this.loadTrainingsByDates(dates, q),
    //                 notes: this.sqlite.query(
    //                     `SELECT date, text, updated_at FROM day_note WHERE date IN (${dates.map(() => '?').join(', ')})`,
    //                     dates,
    //                 ),
    //             }).pipe(
    //                 map(({trainings, notes}) => {
    //                     const noteByDate = new Map(
    //                         notes.map((row) => [
    //                             asString(cell(row, 'date')),
    //                             mapNote(row),
    //                         ]),
    //                     );
    //                     const byDate = new Map<string, TrainingFull[]>();
    //
    //                     for (const training of trainings) {
    //                         const list = byDate.get(training.date) ?? [];
    //                         list.push(training);
    //                         byDate.set(training.date, list);
    //                     }
    //
    //                     return {
    //                         totalCount,
    //                         items: dates.map((date) => ({
    //                             date,
    //                             note: noteByDate.get(date),
    //                             trainings: (byDate.get(date) ?? []).sort(
    //                                 byTrainingSort(q.orderBy),
    //                             ),
    //                         })),
    //                     };
    //                 }),
    //             );
    //         }),
    //     );
    // }

    queryDayNotes(dateFrom: string, dateTo: string): Observable<DayNote[]> {
        if (!dateFrom || !dateTo || dateFrom > dateTo) {
            return of([]);
        }

        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT date, text, updated_at FROM day_note WHERE date >= ? AND date <= ?`,
                    [dateFrom, dateTo],
                ),
            ),
            map((rows) => rows.map(mapNote)),
        );
    }

    queryTrainings(q: TrainingQuery): Observable<TrainingSummary[]> {
        const where = sqlWhere().add('t.deleted = 0');
        where.addIf(q.dateFrom, 't.date >= ?', q.dateFrom ?? '');
        where.addIf(q.dateTo, 't.date <= ?', q.dateTo ?? '');
        where.addIn('t.id', q.trainingIds);

        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT t.id, t.date, t.name, t.comment, t.sort_order, t.template_id,
                  (SELECT COUNT(*) FROM training_exercise te
                   WHERE te.training_id = t.id AND te.deleted = 0) AS exercise_count
           FROM training t
           WHERE ${where.sql}
           ORDER BY ${trainingOrderBySql(q.orderBy, 't.date DESC, t.sort_order ASC')}`,
                    where.params,
                ),
            ),
            map((rows) =>
                rows.map((row) => ({
                    id: asString(cell(row, 'id')),
                    date: asString(cell(row, 'date')),
                    name: asOptionalString(cell(row, 'name')),
                    comment: asOptionalString(cell(row, 'comment')),
                    sortOrder: asNumber(cell(row, 'sort_order')),
                    templateId: asOptionalString(cell(row, 'template_id')),
                    exerciseCount: asNumber(cell(row, 'exercise_count')),
                })),
            ),
        );
    }

    getTraining(id: string): Observable<TrainingFull | undefined> {
        return this.sqlite.init().pipe(
            switchMap(() => this.loadTrainingsByIds([id])),
            map((items) => items[0]),
        );
    }

    getLastSetsFor(
        exerciseId: string,
        excludeTrainingId?: string,
    ): Observable<TrainingSetSnapshot[]> {
        const exclude = excludeTrainingId ? 'AND t2.id != ?' : '';
        const params = excludeTrainingId
            ? [exerciseId, exerciseId, excludeTrainingId]
            : [exerciseId, exerciseId];
        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT ts.id, ts.done, ts.done_at, ts.weight, ts.reps, ts.distance, ts.duration
           FROM training_set ts
           JOIN training_exercise te ON te.id = ts.training_exercise_id
           JOIN training t ON t.id = te.training_id
           WHERE te.exercise_id = ? AND te.deleted = 0 AND ts.deleted = 0 AND t.deleted = 0
             AND t.id = (
               SELECT t2.id FROM training t2
               JOIN training_exercise te2 ON te2.training_id = t2.id
               WHERE te2.exercise_id = ? AND te2.deleted = 0 AND t2.deleted = 0
               ${exclude}
               ORDER BY t2.date DESC, t2.sort_order DESC
               LIMIT 1
             )
           ORDER BY ts.sort_order`,
                    params,
                ),
            ),
            map((rows) => rows.map(mapSetSnapshot)),
        );
    }

    saveTraining(input: TrainingSaveInput): Observable<TrainingFull> {
        const now = nowUtc();
        const domains = [DATA_DOMAIN.Training, DATA_DOMAIN.TrainingSet];
        return this.sqlite
            .transaction((tx) => this.writeTraining(tx, input, now, domains))
            .pipe(
                switchMap((id) => this.getTraining(id)),
                map((training) => {
                    this.revisions.bump(domains);

                    if (!training) {
                        throw new Error('Training was not saved');
                    }

                    return training;
                }),
            );
    }

    setSetsDone(input: SetsDoneInput): Observable<TrainingSetSnapshot[]> {
        if (!input.setIds.length) {
            return of([]);
        }

        const placeholders = input.setIds.map(() => '?').join(', ');
        return this.sqlite
            .transaction((tx) =>
                tx
                    .query(
                        `SELECT * FROM training_set WHERE id IN (${placeholders})`,
                        input.setIds,
                    )
                    .pipe(
                        switchMap((rows) => {
                            const snapshots = rows.map(mapSetSnapshot);
                            const doneAt = input.done ? nowUtc() : null;
                            const fill = input.done && input.fillFactFromPlan;
                            return forkJoin(
                                rows.map((row) => {
                                    const id = asString(cell(row, 'id'));
                                    const weight = fill
                                        ? (asOptionalNumber(cell(row, 'weight')) ??
                                          asOptionalNumber(cell(row, 'planned_weight')))
                                        : asOptionalNumber(cell(row, 'weight'));
                                    const reps = fill
                                        ? (asOptionalNumber(cell(row, 'reps')) ??
                                          asOptionalNumber(cell(row, 'planned_reps')))
                                        : asOptionalNumber(cell(row, 'reps'));
                                    const distance = fill
                                        ? (asOptionalNumber(cell(row, 'distance')) ??
                                          asOptionalNumber(cell(row, 'planned_distance')))
                                        : asOptionalNumber(cell(row, 'distance'));
                                    const duration = fill
                                        ? (asOptionalNumber(cell(row, 'duration')) ??
                                          asOptionalNumber(cell(row, 'planned_duration')))
                                        : asOptionalNumber(cell(row, 'duration'));
                                    return tx.run(
                                        `UPDATE training_set
                   SET done = ?, done_at = ?, weight = ?, reps = ?, distance = ?, duration = ?
                   WHERE id = ?`,
                                        [
                                            input.done ? 1 : 0,
                                            doneAt,
                                            weight ?? null,
                                            reps ?? null,
                                            distance ?? null,
                                            duration ?? null,
                                            id,
                                        ],
                                    );
                                }),
                            ).pipe(map(() => snapshots));
                        }),
                    ),
            )
            .pipe(
                map((snapshots) => {
                    this.revisions.bump([DATA_DOMAIN.TrainingSet], input.origin);
                    return snapshots;
                }),
            );
    }

    restoreSets(snapshots: TrainingSetSnapshot[], origin?: string): Observable<void> {
        if (!snapshots.length) {
            return of(undefined);
        }

        return this.sqlite
            .transaction((tx) =>
                forkJoin(
                    snapshots.map((snap) =>
                        tx.run(
                            `UPDATE training_set
               SET done = ?, done_at = ?, weight = ?, reps = ?, distance = ?, duration = ?
               WHERE id = ?`,
                            [
                                snap.done ? 1 : 0,
                                snap.doneAt ?? null,
                                snap.weight ?? null,
                                snap.reps ?? null,
                                snap.distance ?? null,
                                snap.duration ?? null,
                                snap.id,
                            ],
                        ),
                    ),
                ).pipe(map(() => undefined)),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.TrainingSet], origin);
                }),
            );
    }

    deleteTrainings(ids: string[]): Observable<void> {
        if (!ids.length) {
            return of(undefined);
        }

        const now = nowUtc();
        return this.sqlite
            .transaction((tx) => hideTrainingTrees(tx, ids, now))
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.Training, DATA_DOMAIN.TrainingSet]);
                }),
            );
    }

    reorderTrainings(date: string, orderedIds: string[]): Observable<void> {
        if (!orderedIds.length) {
            return of(undefined);
        }

        return this.sqlite
            .transaction((tx) =>
                forkJoin(
                    orderedIds.map((id, index) =>
                        tx.run(
                            'UPDATE training SET sort_order = ?, updated_at = ? WHERE id = ? AND date = ?',
                            [index, nowUtc(), id, date],
                        ),
                    ),
                ).pipe(map(() => undefined)),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.Training]);
                }),
            );
    }

    saveDayNote(date: string, text: string, origin?: string): Observable<void> {
        const trimmed = text.trim();
        return this.sqlite
            .transaction((tx) =>
                trimmed
                    ? tx.run(
                          'INSERT OR REPLACE INTO day_note (date, text, updated_at) VALUES (?, ?, ?)',
                          [date, trimmed, nowUtc()],
                      )
                    : tx.run('DELETE FROM day_note WHERE date = ?', [date]),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.DayNote], origin);
                }),
            );
    }

    private writeTraining(
        tx: SqliteTransaction,
        input: TrainingSaveInput,
        now: string,
        domains: Array<
            | typeof DATA_DOMAIN.Training
            | typeof DATA_DOMAIN.TrainingSet
            | typeof DATA_DOMAIN.Exercise
        >,
    ): Observable<string> {
        const id = input.id ?? createGuid();
        const upsertTraining = input.id
            ? tx.run(
                  `UPDATE training SET date = ?, name = ?, comment = ?, sort_order = ?, template_id = ?, updated_at = ?
           WHERE id = ?`,
                  [
                      input.date,
                      input.name ?? null,
                      input.comment ?? null,
                      input.sortOrder ?? 0,
                      input.templateId ?? null,
                      now,
                      id,
                  ],
              )
            : tx.run(
                  `INSERT INTO training (id, date, name, comment, sort_order, template_id, deleted, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
                  [
                      id,
                      input.date,
                      input.name ?? null,
                      input.comment ?? null,
                      input.sortOrder ?? 0,
                      input.templateId ?? null,
                      now,
                      now,
                  ],
              );

        return upsertTraining.pipe(
            switchMap(() => fromExercises(tx, id, input, now, domains)),
            map(() => id),
        );
    }

    private loadTrainingsByDates(
        dates: string[],
        q: TrainingQuery,
    ): Observable<TrainingFull[]> {
        const where = sqlWhere().add('t.deleted = 0').addIn('t.date', dates);
        // Фильтры по упражнениям проверяем EXISTS-подзапросами: вложенные модели
        // (exercises с sets) больше не собираем, тренировка несёт только exerciseIds
        where.addIf(
            q.exerciseIds,
            `EXISTS (SELECT 1 FROM training_exercise te
                   WHERE te.training_id = t.id AND te.deleted = 0
                     AND te.exercise_id IN (${q.exerciseIds?.map(() => '?').join(', ') ?? ''}))`,
            ...(q.exerciseIds ?? []),
        );
        where.addIf(
            q.exerciseTypes,
            `EXISTS (SELECT 1 FROM training_exercise te
                   JOIN exercise e ON e.id = te.exercise_id
                   WHERE te.training_id = t.id AND te.deleted = 0
                     AND e.type IN (${q.exerciseTypes?.map(() => '?').join(', ') ?? ''}))`,
            ...(q.exerciseTypes ?? []),
        );
        return this.queryTrainingRows(where.sql, where.params);
    }

    private loadTrainingsByIds(ids: string[]): Observable<TrainingFull[]> {
        if (!ids.length) {
            return of([]);
        }

        const where = sqlWhere().add('t.deleted = 0').addIn('t.id', ids);
        return this.queryTrainingRows(where.sql, where.params);
    }

    private queryTrainingRows(
        whereSql: string,
        params: Array<string | number | null>,
    ): Observable<TrainingFull[]> {
        return this.sqlite
            .query(
                `SELECT
            t.id AS t_id, t.date, t.name AS t_name, t.comment AS t_comment, t.sort_order AS t_sort,
            t.template_id, t.created_at, t.updated_at,
            tt.archived AS template_archived
         FROM training t
         LEFT JOIN training_template tt ON tt.id = t.template_id
         WHERE ${whereSql}
         ORDER BY t.date, t.sort_order`,
                params,
            )
            .pipe(
                switchMap((rows) => {
                    const ids = rows
                        .map((row) => asString(cell(row, 't_id')))
                        .filter(Boolean);

                    if (!ids.length) {
                        return of([]);
                    }

                    // Идентификаторы упражнений — отдельным лёгким запросом без джойнов
                    return this.sqlite
                        .query(
                            `SELECT training_id, exercise_id FROM training_exercise
              WHERE deleted = 0 AND training_id IN (${ids.map(() => '?').join(', ')})
              ORDER BY training_id, sort_order`,
                            ids,
                        )
                        .pipe(map((exerciseRows) => mapTrainings(rows, exerciseRows)));
                }),
            );
    }
}

const TRAINING_SORT_COLUMNS: Record<TrainingSortField, string> = {
    date: 't.date',
    sortOrder: 't.sort_order',
    name: 't.name',
    createdAt: 't.created_at',
    updatedAt: 't.updated_at',
    exerciseCount: 'exercise_count',
};

// ORDER BY из q.orderBy: первый критерий — ORDER BY, остальные — THEN BY
function trainingOrderBySql(
    orderBy: TrainingSort[] | undefined,
    fallback: string,
): string {
    if (!orderBy?.length) {
        return fallback;
    }

    return orderBy
        .map(
            ({field, direction}) =>
                `${TRAINING_SORT_COLUMNS[field]} ${direction === 'desc' ? 'DESC' : 'ASC'}`,
        )
        .join(', ');
}

// Компаратор тренировок внутри дня: критерии кроме date (день задаёт направление дат),
// фолбэк — sortOrder по возрастанию
function byTrainingSort(
    orderBy: TrainingSort[] | undefined,
): (a: TrainingFull, b: TrainingFull) => number {
    const criteria = orderBy?.filter((sort) => sort.field !== 'date') ?? [];

    return (a, b) => {
        for (const {field, direction} of criteria) {
            const compared = compareTrainingFields(a, b, field);

            if (compared) {
                return direction === 'desc' ? -compared : compared;
            }
        }

        return a.sortOrder - b.sortOrder;
    };
}

function compareTrainingFields(
    a: TrainingFull,
    b: TrainingFull,
    field: TrainingSortField,
): number {
    switch (field) {
        case 'date':
            return a.date.localeCompare(b.date);
        case 'sortOrder':
            return a.sortOrder - b.sortOrder;
        case 'name':
            return (a.name ?? '').localeCompare(b.name ?? '');
        case 'createdAt':
            return a.createdAt.localeCompare(b.createdAt);
        case 'updatedAt':
            return a.updatedAt.localeCompare(b.updatedAt);
        case 'exerciseCount':
            return a.exerciseIds.length - b.exerciseIds.length;
    }
}

function hideDroppedExercises(
    tx: SqliteTransaction,
    trainingId: string,
    keepIds: string[],
): Observable<void> {
    const notIn = keepIds.length
        ? `AND id NOT IN (${keepIds.map(() => '?').join(', ')})`
        : '';
    const params = keepIds.length ? [trainingId, ...keepIds] : [trainingId];
    return tx
        .run(
            `UPDATE training_set SET deleted = 1
       WHERE deleted = 0 AND training_exercise_id IN (
         SELECT id FROM training_exercise
         WHERE training_id = ? AND deleted = 0 ${notIn}
       )`,
            params,
        )
        .pipe(
            switchMap(() =>
                tx.run(
                    `UPDATE training_exercise SET deleted = 1
           WHERE training_id = ? AND deleted = 0 ${notIn}`,
                    params,
                ),
            ),
        );
}

function hideTrainingTrees(
    tx: SqliteTransaction,
    ids: string[],
    now: string,
): Observable<void> {
    const placeholders = ids.map(() => '?').join(', ');
    return tx
        .run(
            `UPDATE training_set SET deleted = 1
       WHERE deleted = 0 AND training_exercise_id IN (
         SELECT id FROM training_exercise WHERE training_id IN (${placeholders})
       )`,
            ids,
        )
        .pipe(
            switchMap(() =>
                tx.run(
                    `UPDATE training_exercise SET deleted = 1 WHERE deleted = 0 AND training_id IN (${placeholders})`,
                    ids,
                ),
            ),
            switchMap(() =>
                tx.run(
                    `UPDATE training SET deleted = 1, updated_at = ? WHERE id IN (${placeholders})`,
                    [now, ...ids],
                ),
            ),
        );
}

function fromExercises(
    tx: SqliteTransaction,
    trainingId: string,
    input: TrainingSaveInput,
    now: string,
    domains: Array<
        | typeof DATA_DOMAIN.Training
        | typeof DATA_DOMAIN.TrainingSet
        | typeof DATA_DOMAIN.Exercise
    >,
): Observable<void> {
    const keepIds = input.exercises
        .map((item) => item.id)
        .filter((id): id is string => !!id);
    const hideMissing = hideDroppedExercises(tx, trainingId, keepIds);

    if (!input.exercises.length) {
        return hideMissing;
    }

    return hideMissing.pipe(
        switchMap(() =>
            input.exercises.reduce(
                (acc, draft) =>
                    acc.pipe(
                        switchMap(() => {
                            const createExercise = draft.newExercise
                                ? tx
                                      .run(
                                          `INSERT INTO exercise (id, name, type, comment, archived, deleted, created_at, updated_at)
                       VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
                                          [
                                              draft.exerciseId ?? createGuid(),
                                              draft.newExercise.name,
                                              draft.newExercise.type,
                                              draft.newExercise.comment ?? null,
                                              now,
                                              now,
                                          ],
                                      )
                                      .pipe(
                                          map(() => {
                                              domains.push(DATA_DOMAIN.Exercise);
                                              return draft.exerciseId ?? '';
                                          }),
                                      )
                                : of(draft.exerciseId ?? '');

                            return createExercise.pipe(
                                switchMap((exerciseId) => {
                                    const resolvedExerciseId = draft.newExercise
                                        ? (draft.exerciseId ?? createGuid())
                                        : exerciseId;
                                    // When creating inline, reuse one id.
                                    const finalExerciseId = draft.newExercise
                                        ? resolvedExerciseId || createGuid()
                                        : draft.exerciseId;

                                    if (!finalExerciseId) {
                                        throw new Error('Exercise id is required');
                                    }

                                    const teId = draft.id ?? createGuid();
                                    const upsert = draft.id
                                        ? tx.run(
                                              `UPDATE training_exercise
                         SET exercise_id = ?, sort_order = ?, comment = ?, source_template_exercise_id = ?, deleted = 0
                         WHERE id = ?`,
                                              [
                                                  finalExerciseId,
                                                  draft.sortOrder,
                                                  draft.comment ?? null,
                                                  draft.sourceTemplateExerciseId ?? null,
                                                  teId,
                                              ],
                                          )
                                        : tx.run(
                                              `INSERT INTO training_exercise
                         (id, training_id, exercise_id, sort_order, comment, source_template_exercise_id, deleted)
                         VALUES (?, ?, ?, ?, ?, ?, 0)`,
                                              [
                                                  teId,
                                                  trainingId,
                                                  finalExerciseId,
                                                  draft.sortOrder,
                                                  draft.comment ?? null,
                                                  draft.sourceTemplateExerciseId ?? null,
                                              ],
                                          );
                                    return upsert.pipe(
                                        switchMap(() =>
                                            writeSets(tx, teId, draft.sets, now),
                                        ),
                                    );
                                }),
                            );
                        }),
                    ),
                of(undefined) as Observable<void>,
            ),
        ),
    );
}

function writeSets(
    tx: SqliteTransaction,
    trainingExerciseId: string,
    sets: TrainingSaveInput['exercises'][number]['sets'],
    now: string,
): Observable<void> {
    const keepIds = sets.map((item) => item.id).filter((id): id is string => !!id);
    const hideMissing = keepIds.length
        ? tx.run(
              `UPDATE training_set SET deleted = 1
         WHERE training_exercise_id = ? AND deleted = 0 AND id NOT IN (${keepIds.map(() => '?').join(', ')})`,
              [trainingExerciseId, ...keepIds],
          )
        : tx.run(
              'UPDATE training_set SET deleted = 1 WHERE training_exercise_id = ? AND deleted = 0',
              [trainingExerciseId],
          );

    if (!sets.length) {
        return hideMissing;
    }

    return hideMissing.pipe(
        switchMap(() =>
            forkJoin(
                sets.map((set) => {
                    const id = set.id ?? createGuid();
                    return set.id
                        ? tx.run(
                              `UPDATE training_set SET
                   sort_order = ?, weight = ?, reps = ?, distance = ?, duration = ?,
                   planned_weight = ?, planned_reps = ?, planned_distance = ?, planned_duration = ?,
                   done = ?, done_at = ?, source_template_set_id = ?, deleted = 0
                 WHERE id = ?`,
                              [
                                  set.sortOrder,
                                  set.weight ?? null,
                                  set.reps ?? null,
                                  set.distance ?? null,
                                  set.duration ?? null,
                                  set.plannedWeight ?? null,
                                  set.plannedReps ?? null,
                                  set.plannedDistance ?? null,
                                  set.plannedDuration ?? null,
                                  set.done ? 1 : 0,
                                  set.done ? (set.doneAt ?? now) : null,
                                  set.sourceTemplateSetId ?? null,
                                  id,
                              ],
                          )
                        : tx.run(
                              `INSERT INTO training_set (
                   id, training_exercise_id, sort_order, weight, reps, distance, duration,
                   planned_weight, planned_reps, planned_distance, planned_duration,
                   done, done_at, source_template_set_id, deleted
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                              [
                                  id,
                                  trainingExerciseId,
                                  set.sortOrder,
                                  set.weight ?? null,
                                  set.reps ?? null,
                                  set.distance ?? null,
                                  set.duration ?? null,
                                  set.plannedWeight ?? null,
                                  set.plannedReps ?? null,
                                  set.plannedDistance ?? null,
                                  set.plannedDuration ?? null,
                                  set.done ? 1 : 0,
                                  set.done ? (set.doneAt ?? now) : null,
                                  set.sourceTemplateSetId ?? null,
                              ],
                          );
                }),
            ).pipe(map(() => undefined)),
        ),
    );
}

function mapTrainings(rows: SqliteRow[], exerciseRows: SqliteRow[]): TrainingFull[] {
    const exerciseIdsByTraining = new Map<string, Guid[]>();

    for (const row of exerciseRows) {
        const trainingId = asString(cell(row, 'training_id'));

        if (!trainingId) {
            continue;
        }

        const ids = exerciseIdsByTraining.get(trainingId) ?? [];
        ids.push(asString(cell(row, 'exercise_id')));
        exerciseIdsByTraining.set(trainingId, ids);
    }

    return rows.map((row) => {
        const trainingId = asString(cell(row, 't_id'));

        return {
            id: trainingId,
            date: asString(cell(row, 'date')),
            name: asOptionalString(cell(row, 't_name')),
            comment: asOptionalString(cell(row, 't_comment')),
            sortOrder: asNumber(cell(row, 't_sort')),
            templateId: asOptionalString(cell(row, 'template_id')),
            templateArchived: asBool(cell(row, 'template_archived')),
            createdAt: asString(cell(row, 'created_at')),
            updatedAt: asString(cell(row, 'updated_at')),
            exerciseIds: exerciseIdsByTraining.get(trainingId) ?? [],
        };
    });
}

function mapNote(row: SqliteRow): DayNote {
    return {
        date: asString(cell(row, 'date')),
        text: asString(cell(row, 'text')),
        updatedAt: asString(cell(row, 'updated_at')),
    };
}

function mapSetSnapshot(row: SqliteRow): TrainingSetSnapshot {
    return {
        id: asString(cell(row, 'id')),
        done: asBool(cell(row, 'done')),
        doneAt: asOptionalString(cell(row, 'done_at')),
        weight: asOptionalNumber(cell(row, 'weight')),
        reps: asOptionalNumber(cell(row, 'reps')),
        distance: asOptionalNumber(cell(row, 'distance')),
        duration: asOptionalNumber(cell(row, 'duration')),
    };
}
