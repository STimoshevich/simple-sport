import {EXERCISE_TYPE} from '../models/exercise.model';
import {
    dayMatchesFeedFilter,
    exerciseMatchesFeedFilter,
    hasVisualFeedFilter,
    sessionMatchesFeedFilter,
} from './feed-filter.util';

const empty = {exerciseIds: [] as string[], exerciseTypes: [], showArchived: false};

describe('feed-filter.util', () => {
    const squat = {exerciseId: 'sq', type: EXERCISE_TYPE.Strength, archived: false};
    const run = {exerciseId: 'run', type: EXERCISE_TYPE.Cardio, archived: false};
    const oldLift = {exerciseId: 'old', type: EXERCISE_TYPE.Strength, archived: true};

    it('dims archived rows when the archive toggle is off', () => {
        expect(exerciseMatchesFeedFilter(oldLift, empty)).toBe(false);
        expect(exerciseMatchesFeedFilter(squat, empty)).toBe(true);
        expect(exerciseMatchesFeedFilter(oldLift, {...empty, showArchived: true})).toBe(
            true,
        );
    });

    it('keeps only selected types and ids, combined with AND', () => {
        const filters = {
            exerciseIds: ['sq'],
            exerciseTypes: [EXERCISE_TYPE.Strength],
            showArchived: false,
        };
        expect(exerciseMatchesFeedFilter(squat, filters)).toBe(true);
        expect(exerciseMatchesFeedFilter(run, filters)).toBe(false);
        expect(
            exerciseMatchesFeedFilter({...squat, type: EXERCISE_TYPE.Cardio}, filters),
        ).toBe(false);
    });

    it('dims a session when none of its exercises match', () => {
        expect(
            sessionMatchesFeedFilter([run], {
                ...empty,
                exerciseTypes: [EXERCISE_TYPE.Strength],
            }),
        ).toBe(false);
        expect(
            sessionMatchesFeedFilter([squat, run], {
                ...empty,
                exerciseTypes: [EXERCISE_TYPE.Strength],
            }),
        ).toBe(true);
    });

    it('does not dim an empty day unless type or exercise filters are on', () => {
        expect(dayMatchesFeedFilter([], empty)).toBe(true);
        expect(dayMatchesFeedFilter([], {...empty, exerciseIds: ['sq']})).toBe(false);
        expect(
            dayMatchesFeedFilter([{exercises: [squat]}], {...empty, exerciseIds: ['sq']}),
        ).toBe(true);
    });

    it('treats archived-off as a visual filter', () => {
        expect(hasVisualFeedFilter(empty)).toBe(true);
        expect(hasVisualFeedFilter({...empty, showArchived: true})).toBe(false);
    });
});
