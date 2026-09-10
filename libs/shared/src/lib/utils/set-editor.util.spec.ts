import {
    copySetValues,
    fillFactFromPlan,
    hasCopyableValues,
    isPersistableSet,
    missingExerciseIds,
    sanitizeSetMetric,
    withRenumberedSort,
} from './set-editor.util';

describe('set-editor.util', () => {
    it('copies metric values without done', () => {
        const copy = copySetValues({
            weight: 70,
            reps: 8,
            plannedWeight: 60,
            plannedReps: 10,
        });
        expect(copy).toEqual({
            weight: 70,
            reps: 8,
            distance: undefined,
            duration: undefined,
            plannedWeight: 60,
            plannedReps: 10,
            plannedDistance: undefined,
            plannedDuration: undefined,
        });
        expect(copy).not.toHaveProperty('done');
    });

    it('prefills fact from plan only for empty columns', () => {
        expect(
            fillFactFromPlan({
                weight: 80,
                plannedWeight: 60,
                plannedReps: 10,
            }),
        ).toEqual({
            weight: 80,
            plannedWeight: 60,
            plannedReps: 10,
            reps: 10,
            distance: undefined,
            duration: undefined,
            plannedDistance: undefined,
            plannedDuration: undefined,
        });
    });

    it('keeps empty undone sets out of persistence', () => {
        expect(hasCopyableValues({})).toBe(false);
        expect(isPersistableSet({})).toBe(false);
        expect(isPersistableSet({done: true})).toBe(true);
        expect(isPersistableSet({plannedWeight: 60})).toBe(true);
    });

    it('renumbers sort order after a deletion', () => {
        expect(
            withRenumberedSort([{sortOrder: 0}, {sortOrder: 2}, {sortOrder: 3}]),
        ).toEqual([{sortOrder: 0}, {sortOrder: 1}, {sortOrder: 2}]);
    });

    it('rejects negatives and rounds fractional reps', () => {
        expect(sanitizeSetMetric('weight', -1)).toEqual({kind: 'reject'});
        expect(sanitizeSetMetric('reps', 8.4)).toEqual({kind: 'value', value: 8});
        expect(sanitizeSetMetric('distance', '')).toEqual({kind: 'empty'});
    });

    it('flags rows without a chosen exercise', () => {
        expect(
            missingExerciseIds([
                {id: '1', name: ''},
                {id: '2', exerciseId: 'e1', name: 'Жим'},
            ]),
        ).toEqual(['1']);
    });
});
