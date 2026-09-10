import {EXERCISE_TYPE} from '../models/exercise.model';
import {rankExercisesForPicker, shouldOfferCreateExercise} from './exercise-picker.util';

describe('exercise-picker.util', () => {
    const squat = {
        id: '1',
        name: 'Присед',
        type: EXERCISE_TYPE.Strength,
        archived: false,
        createdAt: '',
        updatedAt: '',
        usageCount: 2,
    };
    const bench = {
        id: '2',
        name: 'Жим лёжа',
        type: EXERCISE_TYPE.Strength,
        archived: false,
        createdAt: '',
        updatedAt: '',
        usageCount: 5,
    };
    const archived = {
        id: '3',
        name: 'Жим Арнольда',
        type: EXERCISE_TYPE.Strength,
        archived: true,
        createdAt: '',
        updatedAt: '',
        usageCount: 9,
    };

    it('filters by substring without case and skips archived', () => {
        expect(
            rankExercisesForPicker([squat, bench, archived], 'жим').map(
                (item) => item.name,
            ),
        ).toEqual(['Жим лёжа']);
    });

    it('sorts by usage then alphabetically', () => {
        expect(
            rankExercisesForPicker([squat, bench], '').map((item) => item.name),
        ).toEqual(['Жим лёжа', 'Присед']);
    });

    it('offers create only when the query has no active matches', () => {
        expect(shouldOfferCreateExercise([bench], 'жим')).toBe(false);
        expect(shouldOfferCreateExercise([bench], 'Жим Арнольда')).toBe(true);
        expect(shouldOfferCreateExercise([bench], '')).toBe(false);
    });
});
