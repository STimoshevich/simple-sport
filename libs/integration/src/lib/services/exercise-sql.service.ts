import {inject, Injectable} from '@angular/core';
import {
    Exercise,
    ExerciseQuery,
    ExerciseSaveInput,
    ExerciseWithUsage,
} from '@simple-sport/shared';
import {map, Observable} from 'rxjs';
import {ExerciseRepository} from '../repositories';

@Injectable({providedIn: 'root'})
export class ExerciseSqlService {
    private readonly exercises = inject(ExerciseRepository);

    /** Каталогный запрос как есть — с usage-статистикой и архивом. */
    query(q: ExerciseQuery = {}): Observable<ExerciseWithUsage[]> {
        return this.exercises.query(q);
    }

    list(includeDeleted = false): Observable<Exercise[]> {
        return this.exercises
            .query({includeArchived: includeDeleted})
            .pipe(
                map((items) =>
                    items.map(
                        ({usageCount: _u, lastUsedAt: _l, ...exercise}) => exercise,
                    ),
                ),
            );
    }

    create(input: ExerciseSaveInput): Observable<Exercise> {
        return this.exercises.save(input);
    }

    update(id: string, patch: ExerciseSaveInput): Observable<Exercise | undefined> {
        return this.exercises.save({...patch, id});
    }

    archive(id: string): Observable<void> {
        return this.exercises.setArchived([id], true);
    }

    restore(id: string): Observable<void> {
        return this.exercises.setArchived([id], false);
    }
}
