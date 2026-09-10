import {EXERCISE_TYPE} from '../models/exercise.model';
import {
    cardioPaceMinPerKm,
    cardioSpeedKmh,
    formatDuration,
    formatPace,
    formatSetSummary,
    hasFactMetrics,
    parseDurationInput,
    visibleSetFields,
} from './set-metrics.util';

describe('set-metrics.util', () => {
    it('shows strength, cardio and stretching fields for new empty sets', () => {
        expect(visibleSetFields(EXERCISE_TYPE.Strength, {})).toEqual(['weight', 'reps']);
        expect(visibleSetFields(EXERCISE_TYPE.Cardio, {})).toEqual([
            'distance',
            'duration',
        ]);
        expect(visibleSetFields(EXERCISE_TYPE.Stretching, {})).toEqual(['duration']);
    });

    it('keeps leftover columns after a type change and adds the new type fields', () => {
        expect(visibleSetFields(EXERCISE_TYPE.Cardio, {weight: 70, reps: 8})).toEqual([
            'distance',
            'duration',
            'weight',
            'reps',
        ]);
    });

    it('treats stretching duration as the only required fact', () => {
        expect(hasFactMetrics(EXERCISE_TYPE.Stretching, {})).toBe(false);
        expect(hasFactMetrics(EXERCISE_TYPE.Stretching, {duration: 120})).toBe(true);
        expect(hasFactMetrics(EXERCISE_TYPE.Strength, {weight: 70})).toBe(true);
    });

    it('parses mm:ss into seconds', () => {
        expect(parseDurationInput('45:30')).toBe(2730);
        expect(parseDurationInput('27:40')).toBe(1660);
        expect(parseDurationInput('02:00')).toBe(120);
        expect(parseDurationInput('1:05:30')).toBe(3930);
        expect(parseDurationInput('27:')).toBeUndefined();
        expect(parseDurationInput('2', {allowBareMinutes: true})).toBe(120);
        expect(parseDurationInput('2')).toBeUndefined();
    });

    it('formats seconds as mm:ss', () => {
        expect(formatDuration(120)).toBe('02:00');
        expect(formatDuration(1660)).toBe('27:40');
        expect(formatDuration(2730)).toBe('45:30');
        expect(formatDuration(3930)).toBe('1:05:30');
    });

    it('computes cardio speed and pace from meters and seconds', () => {
        expect(cardioSpeedKmh(5200, 1660)).toBeCloseTo(11.277, 3);
        expect(cardioPaceMinPerKm(5200, 1660)).toBeCloseTo(5.321, 3);
        expect(formatPace(cardioPaceMinPerKm(5200, 1660))).toBe('5:19');
        expect(cardioSpeedKmh(0, 1660)).toBeUndefined();
    });

    it('formats collapsed set summaries', () => {
        const labels = {weight: 'кг', distance: 'км', speed: 'км/ч'};
        expect(
            formatSetSummary(
                {type: EXERCISE_TYPE.Strength, weight: 70, reps: 8},
                {locale: 'ru-RU', weightUnit: 'kg', distanceUnit: 'km', labels},
            ),
        ).toBe('70 кг × 8');

        expect(
            formatSetSummary(
                {type: EXERCISE_TYPE.Cardio, distance: 5.2, duration: 1660},
                {locale: 'ru-RU', weightUnit: 'kg', distanceUnit: 'km', labels},
            ),
        ).toBe('5,20 км · 27:40 · 11,3 км/ч');

        expect(
            formatSetSummary(
                {type: EXERCISE_TYPE.Stretching, duration: 120},
                {locale: 'ru-RU', weightUnit: 'kg', distanceUnit: 'km', labels},
            ),
        ).toBe('02:00');
    });
});
