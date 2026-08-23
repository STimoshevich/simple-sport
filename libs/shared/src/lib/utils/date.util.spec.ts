import {
    enumerateDayKeys,
    inclusiveDayCount,
    shiftDayKey,
    toDayKey,
    toLocalDayKey,
    todayLocal,
} from './date.util';

describe('date.util', () => {
    it('todayLocal matches toLocalDayKey of now', () => {
        expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(todayLocal()).toBe(toLocalDayKey(new Date()));
    });

    it('toLocalDayKey uses local calendar components, not UTC', () => {
        const date = new Date(2026, 8, 7, 23, 30, 0);
        expect(toLocalDayKey(date)).toBe('2026-09-07');
    });

    it('toDayKey keeps a floating date prefix', () => {
        expect(toDayKey('2026-09-07T18:00:00.000Z')).toBe('2026-09-07');
        expect(toDayKey('2026-09-07')).toBe('2026-09-07');
    });

    it('shiftDayKey crosses month boundaries in local calendar', () => {
        expect(shiftDayKey('2026-09-01', -1)).toBe('2026-08-31');
        expect(shiftDayKey('2026-09-07', -19)).toBe('2026-08-19');
    });

    it('enumerateDayKeys is inclusive and empty when inverted', () => {
        expect(enumerateDayKeys('2026-09-06', '2026-09-07')).toEqual([
            '2026-09-06',
            '2026-09-07',
        ]);
        expect(enumerateDayKeys('2026-09-08', '2026-09-07')).toEqual([]);
        expect(inclusiveDayCount('2026-09-01', '2026-09-20')).toBe(20);
    });
});
