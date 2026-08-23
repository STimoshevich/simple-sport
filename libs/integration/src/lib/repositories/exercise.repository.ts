import {inject, Injectable} from '@angular/core';
import {
    createGuid,
    DATA_DOMAIN,
    DataRevisionStore,
    Exercise,
    ExerciseQuery,
    ExerciseSaveInput,
    ExerciseWithUsage,
    nowUtc,
    sqlWhere,
    exerciseUsageSince,
} from '@simple-sport/shared';
import {map, Observable, switchMap, throwError} from 'rxjs';
import {SqliteStorageService} from '../sqlite-storage.service';
import {asNumber, cell} from '../sqlite.util';
import {mapExercise, mapExerciseWithUsage} from './row-map';

@Injectable({providedIn: 'root'})
export class ExerciseRepository {
    private readonly sqlite = inject(SqliteStorageService);
    private readonly revisions = inject(DataRevisionStore);

    query(q: ExerciseQuery = {}): Observable<ExerciseWithUsage[]> {
        const where = sqlWhere()
            .add('e.deleted = 0')
            .addIf(!q.includeArchived, 'e.archived = 0')
            .addIf(q.search?.trim(), 'e.name LIKE ?', `%${q.search?.trim() ?? ''}%`)
            .addIn('e.type', q.types);

        const usageSince = exerciseUsageSince();
        const usageSelect = q.withUsage
            ? `, (SELECT COUNT(*) FROM training_exercise te
            JOIN training t ON t.id = te.training_id
            WHERE te.exercise_id = e.id AND te.deleted = 0 AND t.deleted = 0 AND t.date >= '${usageSince}') AS usage_count
         , (SELECT MAX(t.date) FROM training_exercise te
            JOIN training t ON t.id = te.training_id
            WHERE te.exercise_id = e.id AND te.deleted = 0 AND t.deleted = 0) AS last_used_at`
            : ', 0 AS usage_count, NULL AS last_used_at';

        return this.sqlite.init().pipe(
            switchMap(() =>
                this.sqlite.query(
                    `SELECT e.* ${usageSelect}
           FROM exercise e
           WHERE ${where.sql}
           ORDER BY e.name COLLATE NOCASE`,
                    where.params,
                ),
            ),
            map((rows) => rows.map(mapExerciseWithUsage)),
        );
    }

    save(input: ExerciseSaveInput): Observable<Exercise> {
        const now = nowUtc();
        return this.sqlite
            .transaction((tx) => {
                if (input.id) {
                    return tx
                        .run(
                            `UPDATE exercise
               SET name = ?, type = ?, comment = ?, updated_at = ?
               WHERE id = ? AND deleted = 0`,
                            [
                                input.name,
                                input.type,
                                input.comment ?? null,
                                now,
                                input.id,
                            ],
                        )
                        .pipe(
                            switchMap(() =>
                                tx.query('SELECT * FROM exercise WHERE id = ?', [
                                    input.id!,
                                ]),
                            ),
                            map((rows) => mapExercise(rows[0] ?? {})),
                        );
                }

                const id = createGuid();
                return tx
                    .run(
                        `INSERT INTO exercise (id, name, type, comment, archived, deleted, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
                        [id, input.name, input.type, input.comment ?? null, now, now],
                    )
                    .pipe(
                        switchMap(() =>
                            tx.query('SELECT * FROM exercise WHERE id = ?', [id]),
                        ),
                        map((rows) => mapExercise(rows[0] ?? {})),
                    );
            })
            .pipe(
                map((exercise) => {
                    this.revisions.bump([DATA_DOMAIN.Exercise]);
                    return exercise;
                }),
            );
    }

    setArchived(ids: string[], archived: boolean): Observable<void> {
        if (!ids.length) {
            return this.sqlite.init().pipe(map(() => undefined));
        }

        const placeholders = ids.map(() => '?').join(', ');
        return this.sqlite
            .transaction((tx) =>
                tx.run(
                    `UPDATE exercise SET archived = ?, updated_at = ? WHERE id IN (${placeholders})`,
                    [archived ? 1 : 0, nowUtc(), ...ids],
                ),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.Exercise]);
                }),
            );
    }

    delete(id: string): Observable<void> {
        return this.sqlite
            .transaction((tx) =>
                tx
                    .query(
                        `SELECT COUNT(*) AS n FROM training_exercise WHERE exercise_id = ? AND deleted = 0`,
                        [id],
                    )
                    .pipe(
                        switchMap((rows) => {
                            if (asNumber(cell(rows[0] ?? {}, 'n')) > 0) {
                                return throwError(() => new Error('Exercise is in use'));
                            }

                            return tx.run(
                                'UPDATE exercise SET deleted = 1, updated_at = ? WHERE id = ?',
                                [nowUtc(), id],
                            );
                        }),
                    ),
            )
            .pipe(
                map(() => {
                    this.revisions.bump([DATA_DOMAIN.Exercise]);
                }),
            );
    }
}
