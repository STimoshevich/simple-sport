import {TestBed} from '@angular/core/testing';
import {
    DATA_DOMAIN,
    DataRevisionStore,
    EXERCISE_TYPE,
    trainingOrderBy,
} from '@simple-sport/shared';
import {firstValueFrom} from 'rxjs';
import {SqliteStorageService} from '../sqlite-storage.service';
import {MemorySqliteStorage} from '../testing/memory-sqlite';
import {ExerciseRepository} from './exercise.repository';
import {NutritionRepository} from './nutrition.repository';
import {SettingsRepository} from './settings.repository';
import {TrainingRepository} from './training.repository';

describe('repository integration (in-memory SQLite)', () => {
    let sqlite: MemorySqliteStorage;
    let exercises: ExerciseRepository;
    let trainings: TrainingRepository;
    let settings: SettingsRepository;
    let nutrition: NutritionRepository;
    let revisions: InstanceType<typeof DataRevisionStore>;

    beforeEach(async () => {
        sqlite = await MemorySqliteStorage.create();
        TestBed.configureTestingModule({
            providers: [{provide: SqliteStorageService, useValue: sqlite}],
        });
        exercises = TestBed.inject(ExerciseRepository);
        trainings = TestBed.inject(TrainingRepository);
        settings = TestBed.inject(SettingsRepository);
        nutrition = TestBed.inject(NutritionRepository);
        revisions = TestBed.inject(DataRevisionStore);
    });

    it('saves settings and reads them back from app_kv', async () => {
        await firstValueFrom(
            settings.patch({theme: 'light', uiFeedFilters: '{"showArchived":true}'}),
        );
        const stored = await firstValueFrom(settings.getSettings());

        expect(stored.theme).toBe('light');
        expect(stored.uiFeedFilters).toBe('{"showArchived":true}');
        expect(revisions.keyOf(DATA_DOMAIN.Settings)).not.toBe('0');
    });

    it('saves an exercise and reports usage after a training uses it', async () => {
        const exercise = await firstValueFrom(
            exercises.save({name: 'Squat', type: EXERCISE_TYPE.Strength}),
        );

        await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                name: 'Legs',
                exercises: [
                    {
                        exerciseId: exercise.id,
                        sortOrder: 0,
                        sets: [{sortOrder: 0, plannedWeight: 80, plannedReps: 5}],
                    },
                ],
            }),
        );

        const listed = await firstValueFrom(
            exercises.query({includeArchived: true, withUsage: true}),
        );
        expect(listed).toHaveLength(1);
        expect(listed[0]?.usageCount).toBe(1);
        expect(listed[0]?.lastUsedAt).toBe('2026-09-07');
    });

    it('refuses to delete an exercise that is still used', async () => {
        const exercise = await firstValueFrom(
            exercises.save({name: 'Bench', type: EXERCISE_TYPE.Strength}),
        );
        await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                exercises: [
                    {exerciseId: exercise.id, sortOrder: 0, sets: [{sortOrder: 0}]},
                ],
            }),
        );

        await expect(firstValueFrom(exercises.delete(exercise.id))).rejects.toThrow(
            'Exercise is in use',
        );

        const listed = await firstValueFrom(exercises.query());
        expect(listed).toHaveLength(1);
    });

    it('rolls back a mid-write failure and leaves no training rows', async () => {
        await expect(
            firstValueFrom(
                trainings.saveTraining({
                    date: '2026-09-07',
                    name: 'Broken',
                    exercises: [
                        {
                            exerciseId: 'missing-exercise',
                            sortOrder: 0,
                            sets: [{sortOrder: 0, plannedReps: 8}],
                        },
                    ],
                }),
            ),
        ).rejects.toThrow();

        const leftover = await firstValueFrom(trainings.queryTrainings({}));
        expect(leftover).toEqual([]);

        const trainingRows = await firstValueFrom(
            sqlite.query('SELECT id FROM training'),
        );
        expect(trainingRows).toEqual([]);
    });

    it('returns a snapshot from setSetsDone and restoreSets returns the previous values', async () => {
        const exercise = await firstValueFrom(
            exercises.save({name: 'Row', type: EXERCISE_TYPE.Strength}),
        );
        const training = await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                exercises: [
                    {
                        exerciseId: exercise.id,
                        sortOrder: 0,
                        sets: [{sortOrder: 0, plannedWeight: 60, plannedReps: 10}],
                    },
                ],
            }),
        );

        // TrainingFull больше не несёт вложенные sets — идентификаторы берём напрямую из sqlite
        const setRows = await firstValueFrom(sqlite.query('SELECT id FROM training_set'));
        const setId = setRows[0]?.['id'] as string;
        expect(setId).toBeTruthy();

        const snapshots = await firstValueFrom(
            trainings.setSetsDone({
                setIds: [setId],
                done: true,
                fillFactFromPlan: true,
            }),
        );

        expect(snapshots).toHaveLength(1);
        expect(snapshots[0]?.done).toBe(false);
        expect(snapshots[0]?.weight).toBeUndefined();

        const doneRows = await firstValueFrom(
            sqlite.query('SELECT done, weight, reps FROM training_set WHERE id = ?', [
                setId,
            ]),
        );
        expect(doneRows[0]?.['done']).toBe(1);
        expect(doneRows[0]?.['weight']).toBe(60);
        expect(doneRows[0]?.['reps']).toBe(10);

        await firstValueFrom(trainings.restoreSets(snapshots));

        const restoredRows = await firstValueFrom(
            sqlite.query('SELECT done, weight, reps FROM training_set WHERE id = ?', [
                setId,
            ]),
        );
        expect(restoredRows[0]?.['done']).toBe(0);
        expect(restoredRows[0]?.['weight']).toBeNull();
        expect(restoredRows[0]?.['reps']).toBeNull();
    });

    it('reports date bounds of saved trainings', async () => {
        const empty = await firstValueFrom(trainings.queryDateBounds());
        expect(empty.minDate).toBeUndefined();
        expect(empty.maxDate).toBeUndefined();

        const exercise = await firstValueFrom(
            exercises.save({name: 'Press', type: EXERCISE_TYPE.Strength}),
        );
        await firstValueFrom(
            trainings.saveTraining({
                date: '2026-08-01',
                exercises: [
                    {exerciseId: exercise.id, sortOrder: 0, sets: [{sortOrder: 0}]},
                ],
            }),
        );
        await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                exercises: [
                    {exerciseId: exercise.id, sortOrder: 0, sets: [{sortOrder: 0}]},
                ],
            }),
        );

        const bounds = await firstValueFrom(trainings.queryDateBounds());
        expect(bounds.minDate).toBe('2026-08-01');
        expect(bounds.maxDate).toBe('2026-09-07');
    });

    it('soft-deletes omitted exercises together with their sets', async () => {
        const squat = await firstValueFrom(
            exercises.save({name: 'Squat', type: EXERCISE_TYPE.Strength}),
        );
        const bench = await firstValueFrom(
            exercises.save({name: 'Bench', type: EXERCISE_TYPE.Strength}),
        );
        const training = await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                exercises: [
                    {
                        exerciseId: squat.id,
                        sortOrder: 0,
                        sets: [{sortOrder: 0, plannedReps: 5}],
                    },
                    {
                        exerciseId: bench.id,
                        sortOrder: 1,
                        sets: [{sortOrder: 0, plannedReps: 8}],
                    },
                ],
            }),
        );
        // Идентификаторы строк training_exercise/training_set берём напрямую из sqlite
        const exerciseRows = await firstValueFrom(
            sqlite.query(
                'SELECT id, exercise_id FROM training_exercise WHERE deleted = 0',
            ),
        );
        const keptId = exerciseRows.find((row) => row['exercise_id'] === squat.id)?.[
            'id'
        ] as string;
        const droppedId = exerciseRows.find((row) => row['exercise_id'] === bench.id)?.[
            'id'
        ] as string;

        const keptSetRows = await firstValueFrom(
            sqlite.query('SELECT id FROM training_set WHERE training_exercise_id = ?', [
                keptId,
            ]),
        );

        await firstValueFrom(
            trainings.saveTraining({
                id: training.id,
                date: training.date,
                exercises: [
                    {
                        id: keptId,
                        exerciseId: squat.id,
                        sortOrder: 0,
                        sets: keptSetRows.map((row, index) => ({
                            id: row['id'] as string,
                            sortOrder: index,
                        })),
                    },
                ],
            }),
        );

        const visible = await firstValueFrom(trainings.getTraining(training.id));
        expect(visible?.exerciseIds).toEqual([squat.id]);

        const hiddenExercise = await firstValueFrom(
            sqlite.query('SELECT deleted FROM training_exercise WHERE id = ?', [
                droppedId,
            ]),
        );
        const hiddenSets = await firstValueFrom(
            sqlite.query(
                'SELECT deleted FROM training_set WHERE training_exercise_id = ?',
                [droppedId],
            ),
        );
        expect(hiddenExercise[0]?.['deleted']).toBe(1);
        expect(hiddenSets.every((row) => row['deleted'] === 1)).toBe(true);
        expect(hiddenSets.length).toBeGreaterThan(0);
    });

    it('cascades training deletion to exercises and sets', async () => {
        const exercise = await firstValueFrom(
            exercises.save({name: 'Deadlift', type: EXERCISE_TYPE.Strength}),
        );
        const training = await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                exercises: [
                    {
                        exerciseId: exercise.id,
                        sortOrder: 0,
                        sets: [{sortOrder: 0, plannedWeight: 100, plannedReps: 3}],
                    },
                ],
            }),
        );
        // Идентификаторы вложенных строк берём напрямую из sqlite
        const exerciseRows = await firstValueFrom(
            sqlite.query('SELECT id FROM training_exercise WHERE deleted = 0'),
        );
        const exerciseRowId = exerciseRows[0]?.['id'] as string;
        const setRows = await firstValueFrom(
            sqlite.query('SELECT id FROM training_set WHERE deleted = 0'),
        );
        const setId = setRows[0]?.['id'] as string;

        await firstValueFrom(trainings.deleteTrainings([training.id]));

        expect(await firstValueFrom(trainings.getTraining(training.id))).toBeUndefined();
        const days = await firstValueFrom(
            trainings.queryDays({dateFrom: '2026-09-07', dateTo: '2026-09-07'}),
        );
        expect(days.items[0]?.trainings ?? []).toEqual([]);

        const flags = await firstValueFrom(
            sqlite.query(
                `SELECT
           (SELECT deleted FROM training WHERE id = ?) AS training_deleted,
           (SELECT deleted FROM training_exercise WHERE id = ?) AS exercise_deleted,
           (SELECT deleted FROM training_set WHERE id = ?) AS set_deleted`,
                [training.id, exerciseRowId, setId],
            ),
        );
        expect(flags[0]?.['training_deleted']).toBe(1);
        expect(flags[0]?.['exercise_deleted']).toBe(1);
        expect(flags[0]?.['set_deleted']).toBe(1);
    });

    it('reorders trainings of a day in one operation', async () => {
        const exercise = await firstValueFrom(
            exercises.save({name: 'Curl', type: EXERCISE_TYPE.Strength}),
        );
        const first = await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                name: 'A',
                sortOrder: 0,
                exercises: [
                    {exerciseId: exercise.id, sortOrder: 0, sets: [{sortOrder: 0}]},
                ],
            }),
        );
        const second = await firstValueFrom(
            trainings.saveTraining({
                date: '2026-09-07',
                name: 'B',
                sortOrder: 1,
                exercises: [
                    {exerciseId: exercise.id, sortOrder: 0, sets: [{sortOrder: 0}]},
                ],
            }),
        );

        await firstValueFrom(
            trainings.reorderTrainings('2026-09-07', [second.id, first.id]),
        );

        const day = await firstValueFrom(
            trainings.queryDays({dateFrom: '2026-09-07', dateTo: '2026-09-07'}),
        );
        expect(day.items[0]?.trainings.map((item) => item.name)).toEqual(['B', 'A']);
    });

    it('sorts by several orderBy.thenBy criteria in queryTrainings and queryDays', async () => {
        const exercise = await firstValueFrom(
            exercises.save({name: 'Row', type: EXERCISE_TYPE.Strength}),
        );
        const save = (date: string, name: string, sortOrder: number) =>
            firstValueFrom(
                trainings.saveTraining({
                    date,
                    name,
                    sortOrder,
                    exercises: [
                        {exerciseId: exercise.id, sortOrder: 0, sets: [{sortOrder: 0}]},
                    ],
                }),
            );

        await save('2026-09-07', 'Beta', 0);
        await save('2026-09-07', 'Alpha', 1);
        await save('2026-09-06', 'Zulu', 0);

        // queryTrainings: ORDER BY date DESC, THEN BY name ASC
        const summaries = await firstValueFrom(
            trainings.queryTrainings({
                orderBy: trainingOrderBy('date', 'desc').thenBy('name'),
            }),
        );
        expect(summaries.map((item) => item.name)).toEqual(['Alpha', 'Beta', 'Zulu']);

        // queryDays: направление дней из date, тренировки внутри дня — из остальных критериев
        const days = await firstValueFrom(
            trainings.queryDays({
                orderBy: trainingOrderBy('date', 'asc').thenBy('name', 'desc'),
            }),
        );
        expect(days.items.map((day) => day.date)).toEqual(['2026-09-06', '2026-09-07']);
        expect(days.items[1]?.trainings.map((item) => item.name)).toEqual([
            'Beta',
            'Alpha',
        ]);
    });

    it('saves a day note and removes it when the text is cleared', async () => {
        await firstValueFrom(trainings.saveDayNote('2026-09-07', '  slept well  '));
        const notes = await firstValueFrom(
            trainings.queryDayNotes('2026-09-07', '2026-09-07'),
        );
        expect(notes).toEqual([
            expect.objectContaining({date: '2026-09-07', text: 'slept well'}),
        ]);
        expect(revisions.keyOf(DATA_DOMAIN.DayNote)).not.toBe('0');

        await firstValueFrom(trainings.saveDayNote('2026-09-07', '   '));
        expect(
            await firstValueFrom(trainings.queryDayNotes('2026-09-07', '2026-09-07')),
        ).toEqual([]);
    });

    it('saves a dish and reports usage after a meal entry references it', async () => {
        const dish = await firstValueFrom(
            nutrition.saveDish({
                name: 'Oatmeal',
                caloriesPer100g: 350,
                proteinPer100g: 12,
            }),
        );

        const unused = await firstValueFrom(
            nutrition.queryDishes({includeArchived: true, withUsage: true}),
        );
        expect(unused).toHaveLength(1);
        expect(unused[0]?.name).toBe('Oatmeal');
        expect(unused[0]?.usageCount).toBe(0);
        expect(unused[0]?.lastUsedAt).toBeUndefined();

        const group = await firstValueFrom(nutrition.ensureDayGroup('2026-09-07'));
        await firstValueFrom(
            nutrition.saveEntry({
                groupId: group.id,
                dishId: dish.id,
                name: 'Oatmeal',
                grams: 200,
                calories: 700,
                protein: 24,
            }),
        );

        const listed = await firstValueFrom(
            nutrition.queryDishes({includeArchived: true, withUsage: true}),
        );
        expect(listed[0]?.usageCount).toBe(1);
        expect(listed[0]?.lastUsedAt).toBe('2026-09-07');
        expect(revisions.keyOf(DATA_DOMAIN.Dish)).not.toBe('0');
    });

    it('refuses to delete a dish that is still used and archives it instead', async () => {
        const dish = await firstValueFrom(
            nutrition.saveDish({name: 'Rice', caloriesPer100g: 130}),
        );
        const group = await firstValueFrom(nutrition.ensureDayGroup('2026-09-07'));
        await firstValueFrom(
            nutrition.saveEntry({
                groupId: group.id,
                dishId: dish.id,
                name: 'Rice',
                calories: 260,
            }),
        );

        await expect(firstValueFrom(nutrition.deleteDish(dish.id))).rejects.toThrow(
            'Dish is in use',
        );

        await firstValueFrom(nutrition.setDishArchived([dish.id], true));
        const activeOnly = await firstValueFrom(nutrition.queryDishes());
        expect(activeOnly).toEqual([]);

        const withArchived = await firstValueFrom(
            nutrition.queryDishes({includeArchived: true}),
        );
        expect(withArchived[0]?.archived).toBe(true);
    });

    it('saves a meal category, reports usage and archives it on demand', async () => {
        const category = await firstValueFrom(nutrition.saveCategory({name: 'Lunch'}));
        expect(revisions.keyOf(DATA_DOMAIN.MealCategory)).not.toBe('0');

        await firstValueFrom(
            sqlite.run(
                `INSERT INTO meal_group (id, date, category_id, name, sort_order, deleted, created_at)
         VALUES ('group-1', '2026-09-07', ?, NULL, 0, 0, '2026-09-07')`,
                [category.id],
            ),
        );

        const listed = await firstValueFrom(
            nutrition.queryCategories({includeArchived: true}),
        );
        expect(listed).toHaveLength(1);
        expect(listed[0]?.usageCount).toBe(1);

        await expect(
            firstValueFrom(nutrition.deleteCategory(category.id, 'delete')),
        ).rejects.toThrow('Category is in use');

        await firstValueFrom(nutrition.deleteCategory(category.id, 'archive'));
        const activeOnly = await firstValueFrom(nutrition.queryCategories());
        expect(activeOnly).toEqual([]);

        const withArchived = await firstValueFrom(
            nutrition.queryCategories({includeArchived: true}),
        );
        expect(withArchived[0]?.archived).toBe(true);
    });
});
