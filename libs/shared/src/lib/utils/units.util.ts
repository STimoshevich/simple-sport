import {DistanceUnit, EnergyUnit, WeightUnit} from '../models/settings.model';

export interface DisplayUnits {
    weight: WeightUnit;
    distance: DistanceUnit;
    energy: EnergyUnit;
}

export const DEFAULT_DISPLAY_UNITS: DisplayUnits = {
    weight: 'kg',
    distance: 'km',
    energy: 'kcal',
};

export const WEIGHT_UNIT_LABEL: Record<WeightUnit, string> = {
    kg: 'APP.SETTINGS.UNITS.KG',
    lb: 'APP.SETTINGS.UNITS.LB',
};

export const DISTANCE_UNIT_LABEL: Record<DistanceUnit, string> = {
    m: 'APP.SETTINGS.UNITS.M',
    km: 'APP.SETTINGS.UNITS.KM',
    mi: 'APP.SETTINGS.UNITS.MI',
};

export const ENERGY_UNIT_LABEL: Record<EnergyUnit, string> = {
    kcal: 'APP.SETTINGS.UNITS.KCAL',
    kj: 'APP.SETTINGS.UNITS.KJ',
};

const LB_PER_KG = 2.2046226218;
const M_PER_MI = 1609.344;
const KJ_PER_KCAL = 4.184;

export function toDisplayWeight(
    kg: number | undefined,
    unit: WeightUnit,
): number | undefined {
    if (!isFiniteNumber(kg)) {
        return undefined;
    }

    if (unit === 'kg') {
        return kg;
    }

    return kg * LB_PER_KG;
}

export function toCanonicalWeight(
    value: number | undefined,
    unit: WeightUnit,
): number | undefined {
    if (!isFiniteNumber(value)) {
        return undefined;
    }

    if (unit === 'kg') {
        return value;
    }

    return value / LB_PER_KG;
}

/** `meters` is the canonical DB unit. */
export function toDisplayDistance(
    meters: number | undefined,
    unit: DistanceUnit,
): number | undefined {
    if (!isFiniteNumber(meters)) {
        return undefined;
    }

    if (unit === 'm') {
        return meters;
    }

    if (unit === 'km') {
        return meters / 1000;
    }

    return meters / M_PER_MI;
}

export function toCanonicalDistance(
    value: number | undefined,
    unit: DistanceUnit,
): number | undefined {
    if (!isFiniteNumber(value)) {
        return undefined;
    }

    if (unit === 'm') {
        return value;
    }

    if (unit === 'km') {
        return value * 1000;
    }

    return value * M_PER_MI;
}

export function toDisplayEnergy(
    kcal: number | undefined,
    unit: EnergyUnit,
): number | undefined {
    if (!isFiniteNumber(kcal)) {
        return undefined;
    }

    if (unit === 'kcal') {
        return kcal;
    }

    return kcal * KJ_PER_KCAL;
}

export function toCanonicalEnergy(
    value: number | undefined,
    unit: EnergyUnit,
): number | undefined {
    if (!isFiniteNumber(value)) {
        return undefined;
    }

    if (unit === 'kcal') {
        return value;
    }

    return value / KJ_PER_KCAL;
}

function isFiniteNumber(value: number | undefined): value is number {
    return value !== undefined && Number.isFinite(value);
}
