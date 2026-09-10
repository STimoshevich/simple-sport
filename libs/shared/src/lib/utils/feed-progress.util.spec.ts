import {
    applyTrainingOrder,
    decorateFeedDays,
    decorateFeedExercise,
    exerciseCheckState,
    isSessionDone,
    resolveFeedToggle,
    sessionDisplayName,
    setProgress,
} from './feed-progress.util';

describe('feed-progress.util', () => {
    it('treats an exercise with no sets as empty and not done', () => {
        expect(exerciseCheckState(0, 0)).toBe('empty');
        expect(isSessionDone([{checkState: 'empty'}])).toBe(false);
    });

    it('maps none / partial / all from done and total counts', () => {
        expect(exerciseCheckState(0, 4)).toBe('none');
        expect(exerciseCheckState(2, 4)).toBe('partial');
        expect(exerciseCheckState(4, 4)).toBe('all');
    });

    it('marks a session done only when every exercise is fully done', () => {
        expect(isSessionDone([])).toBe(false);
        expect(isSessionDone([{checkState: 'all'}, {checkState: 'partial'}])).toBe(false);
        expect(isSessionDone([{checkState: 'all'}, {checkState: 'all'}])).toBe(true);
    });

    it('applies pending set overlays before counting', () => {
        const decorated = decorateFeedExercise(
            {
                sets: [
                    {id: 'a', done: false},
                    {id: 'b', done: false},
                    {id: 'c', done: true},
                    {id: 'd', done: false},
                ],
            },
            {a: true, d: true},
        );

        expect(decorated.doneSets).toBe(3);
        expect(decorated.totalSets).toBe(4);
        expect(decorated.checkState).toBe('partial');
        expect(setProgress(decorated.sets)).toEqual({doneSets: 3, totalSets: 4});
    });

    it('recomputes session allDone after a pending overlay', () => {
        const [day] = decorateFeedDays(
            [
                {
                    trainings: [
                        {
                            allDone: false,
                            exercises: [
                                {
                                    sets: [
                                        {id: 'a', done: false},
                                        {id: 'b', done: true},
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            {a: true},
        );

        expect(day?.trainings[0]?.allDone).toBe(true);
    });

    it('builds untitled names from exercise list', () => {
        expect(sessionDisplayName('', [], 'Тренировка', 'и ещё', '')).toBe('Тренировка');
        expect(sessionDisplayName('', ['Жим лёжа'], 'Тренировка', 'и ещё', '')).toBe(
            'Жим лёжа',
        );
        expect(
            sessionDisplayName(
                '',
                ['Жим лёжа', 'Разводка', 'Французский'],
                'Тренировка',
                'и ещё',
                '',
            ),
        ).toBe('Жим лёжа и ещё 2');
        expect(
            sessionDisplayName(
                '',
                ['Bench', 'Row', 'Curl', 'Fly'],
                'Workout',
                'and',
                'more',
            ),
        ).toBe('Bench and 3 more');
        expect(
            sessionDisplayName(' Грудь ', ['Жим лёжа'], 'Тренировка', 'и ещё', ''),
        ).toBe('Грудь');
    });

    it('resolves feed checkbox targets: remaining, then all off', () => {
        const sets = [
            {id: 'a', done: true},
            {id: 'b', done: false},
            {id: 'c', done: false},
            {id: 'd', done: false},
        ];

        expect(resolveFeedToggle(sets, {})).toEqual({
            setIds: ['b', 'c', 'd'],
            done: true,
        });
        expect(resolveFeedToggle(sets, {b: true, c: true, d: true})).toEqual({
            setIds: ['a', 'b', 'c', 'd'],
            done: false,
        });
        expect(resolveFeedToggle([], {})).toBeNull();
    });

    it('reorders trainings in a day from a pending id list', () => {
        const days = applyTrainingOrder(
            [
                {
                    date: '2026-09-07',
                    trainings: [{id: 'a'}, {id: 'b'}, {id: 'c'}],
                },
            ],
            {'2026-09-07': ['c', 'a', 'b']},
        );

        expect(days[0]?.trainings.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    });
});
