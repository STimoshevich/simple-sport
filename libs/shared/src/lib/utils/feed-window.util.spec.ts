import {
    pastPagesToCoverDay,
    resolveFutureWindow,
    resolvePastWindow,
} from './feed-window.util';

describe('feed-window.util', () => {
    it('first page is 20 calendar days ending today when history is empty', () => {
        const window = resolvePastWindow({
            today: '2026-09-07',
            offset: 0,
            itemsPerPage: 20,
        });

        expect(window).toEqual({
            from: '2026-08-19',
            to: '2026-09-07',
            totalCount: 20,
        });
    });

    it('keeps the first page at 20 days when the earliest record is recent', () => {
        const window = resolvePastWindow({
            today: '2026-09-07',
            offset: 0,
            itemsPerPage: 20,
            earliestDate: '2026-09-06',
        });

        expect(window).toEqual({
            from: '2026-08-19',
            to: '2026-09-07',
            totalCount: 20,
        });
    });

    it('pages older days until the earliest record', () => {
        const page2 = resolvePastWindow({
            today: '2026-09-07',
            offset: 20,
            itemsPerPage: 20,
            earliestDate: '2026-07-01',
        });

        expect(page2).toEqual({
            from: '2026-07-30',
            to: '2026-08-18',
            totalCount: 69,
        });
    });

    it('refresh of two pages asks for 40 days from today', () => {
        const window = resolvePastWindow({
            today: '2026-09-07',
            offset: 0,
            itemsPerPage: 40,
            earliestDate: '2026-07-01',
        });

        expect(window).toEqual({
            from: '2026-07-30',
            to: '2026-09-07',
            totalCount: 69,
        });
    });

    it('clips the past window to date filters', () => {
        const window = resolvePastWindow({
            today: '2026-09-07',
            offset: 0,
            itemsPerPage: 20,
            earliestDate: '2026-01-01',
            filterFrom: '2026-09-01',
            filterTo: '2026-09-05',
        });

        expect(window).toEqual({
            from: '2026-09-01',
            to: '2026-09-05',
            totalCount: 5,
        });
    });

    it('open-ended start date uses today as the window end', () => {
        const window = resolvePastWindow({
            today: '2026-09-07',
            offset: 0,
            itemsPerPage: 20,
            earliestDate: '2026-01-01',
            filterFrom: '2026-09-01',
        });

        expect(window).toEqual({
            from: '2026-09-01',
            to: '2026-09-07',
            totalCount: 7,
        });
    });

    it('returns null when the filter range is entirely in the future', () => {
        expect(
            resolvePastWindow({
                today: '2026-09-07',
                offset: 0,
                itemsPerPage: 20,
                filterFrom: '2026-09-10',
                filterTo: '2026-09-12',
            }),
        ).toBeNull();
    });

    it('builds a future window with empty days up to the last planned date', () => {
        expect(
            resolveFutureWindow({
                today: '2026-09-07',
                latestDate: '2026-09-10',
            }),
        ).toEqual({from: '2026-09-08', to: '2026-09-10'});
    });

    it('counts past pages needed to keep an older day in the loaded window', () => {
        expect(pastPagesToCoverDay('2026-09-07', '2026-09-07')).toBe(1);
        expect(pastPagesToCoverDay('2026-09-07', '2026-08-19')).toBe(1);
        expect(pastPagesToCoverDay('2026-09-07', '2026-08-18')).toBe(2);
        expect(pastPagesToCoverDay('2026-09-07', '2026-09-10')).toBe(1);
    });

    it('omits the future window when nothing is planned after today', () => {
        expect(
            resolveFutureWindow({today: '2026-09-07', latestDate: '2026-09-07'}),
        ).toBeNull();
        expect(resolveFutureWindow({today: '2026-09-07'})).toBeNull();
    });
});
