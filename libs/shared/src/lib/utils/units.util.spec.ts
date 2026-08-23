import {toCanonicalDistance, toDisplayDistance, toDisplayEnergy} from './units.util';

describe('units.util', () => {
    it('stores distance as meters and displays km / mi', () => {
        expect(toCanonicalDistance(1.5, 'km')).toBe(1500);
        expect(toDisplayDistance(1500, 'km')).toBe(1.5);
        expect(toDisplayDistance(1609.344, 'mi')).toBeCloseTo(1, 5);
    });

    it('converts energy to kJ only for display', () => {
        expect(toDisplayEnergy(1850, 'kj')).toBeCloseTo(1850 * 4.184, 5);
    });
});
