import {ExerciseType} from '../models/exercise.model';
import {DistanceUnit, WeightUnit} from '../models/settings.model';
import {toCanonicalDistance} from './units.util';

export type SetMetricField = 'weight' | 'reps' | 'distance' | 'duration';

export const SET_FIELDS_BY_TYPE: Record<ExerciseType, readonly SetMetricField[]> = {
    strength: ['weight', 'reps'],
    cardio: ['distance', 'duration'],
    stretching: ['duration'],
};

export interface SetMetricValues {
    type?: ExerciseType;
    weight?: number;
    reps?: number;
    distance?: number;
    duration?: number;
    plannedWeight?: number;
    plannedReps?: number;
    plannedDistance?: number;
    plannedDuration?: number;
}

export interface SetSummaryLabels {
    weight: string;
    distance: string;
    speed: string;
}

const FIELD_ORDER: readonly SetMetricField[] = ['weight', 'reps', 'distance', 'duration'];

export function isPresentMetric(value: number | undefined | null): boolean {
    return value !== undefined && value !== null && value !== 0 && Number.isFinite(value);
}

export function filledSetFields(set: SetMetricValues): SetMetricField[] {
    return FIELD_ORDER.filter(
        (field) =>
            isPresentMetric(factValue(set, field)) ||
            isPresentMetric(planValue(set, field)),
    );
}

/** Type fields for a new set, plus leftover columns from a previous type (ОВ-3). */
export function visibleSetFields(
    type: ExerciseType | undefined,
    set: SetMetricValues,
): SetMetricField[] {
    const byType = SET_FIELDS_BY_TYPE[type ?? 'strength'];
    const seen = new Set<SetMetricField>();
    const fields: SetMetricField[] = [];

    for (const field of [...byType, ...filledSetFields(set)]) {
        if (seen.has(field)) {
            continue;
        }

        seen.add(field);
        fields.push(field);
    }

    return fields;
}

export function hasFactMetrics(
    type: ExerciseType | undefined,
    set: SetMetricValues,
): boolean {
    return visibleSetFields(type, set).some((field) =>
        isPresentMetric(factValue(set, field)),
    );
}

export function parseDurationInput(
    text: string,
    options?: {allowBareMinutes?: boolean},
): number | undefined {
    const raw = text.trim();

    if (!raw) {
        return undefined;
    }

    const parts = raw.split(':').map((part) => part.trim());

    if (parts.some((part) => part === '' || !/^\d+$/.test(part))) {
        return undefined;
    }

    const nums = parts.map(Number);

    if (nums.some((value) => !Number.isFinite(value))) {
        return undefined;
    }

    if (nums.length === 1) {
        if (!options?.allowBareMinutes) {
            return undefined;
        }

        const minutes = nums[0] ?? 0;
        return minutes * 60;
    }

    if (nums.length === 2) {
        const minutes = nums[0] ?? 0;
        const seconds = nums[1] ?? 0;

        if (seconds >= 60) {
            return undefined;
        }

        return minutes * 60 + seconds;
    }

    if (nums.length === 3) {
        const hours = nums[0] ?? 0;
        const minutes = nums[1] ?? 0;
        const seconds = nums[2] ?? 0;

        if (minutes >= 60 || seconds >= 60) {
            return undefined;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    return undefined;
}

export function formatDuration(seconds: number | undefined | null): string {
    if (!isPresentMetric(seconds) || seconds === undefined || seconds === null) {
        return '';
    }

    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;

    if (hours > 0) {
        return `${hours}:${pad2(minutes)}:${pad2(rest)}`;
    }

    return `${pad2(minutes)}:${pad2(rest)}`;
}

export function cardioSpeedKmh(
    distanceMeters: number,
    durationSeconds: number,
): number | undefined {
    if (!distanceMeters || !durationSeconds) {
        return undefined;
    }

    return (distanceMeters / durationSeconds) * 3.6;
}

export function cardioPaceMinPerKm(
    distanceMeters: number,
    durationSeconds: number,
): number | undefined {
    if (!distanceMeters || !durationSeconds) {
        return undefined;
    }

    return durationSeconds / (distanceMeters / 1000) / 60;
}

export function cardioSpeed(
    distanceMeters: number,
    durationSeconds: number,
    unit: DistanceUnit,
): number | undefined {
    const kmh = cardioSpeedKmh(distanceMeters, durationSeconds);

    if (kmh === undefined) {
        return undefined;
    }

    if (unit === 'mi') {
        return kmh / 1.609344;
    }

    return kmh;
}

export function cardioPaceMinutes(
    distanceMeters: number,
    durationSeconds: number,
    unit: DistanceUnit,
): number | undefined {
    if (!distanceMeters || !durationSeconds) {
        return undefined;
    }

    const metersPerUnit = unit === 'mi' ? 1609.344 : 1000;
    return durationSeconds / (distanceMeters / metersPerUnit) / 60;
}

export function formatPace(totalMinutes: number | undefined): string {
    if (!isPresentMetric(totalMinutes) || totalMinutes === undefined) {
        return '';
    }

    let minutes = Math.floor(totalMinutes);
    let seconds = Math.round((totalMinutes - minutes) * 60);

    if (seconds === 60) {
        minutes += 1;
        seconds = 0;
    }

    return `${minutes}:${pad2(seconds)}`;
}

export function formatSetSummary(
    set: SetMetricValues,
    options: {
        locale: string;
        weightUnit: WeightUnit;
        distanceUnit: DistanceUnit;
        labels: SetSummaryLabels;
    },
): string {
    const factFields = FIELD_ORDER.filter((field) =>
        isPresentMetric(factValue(set, field)),
    );
    const parts: string[] = [];

    const hasWeight = factFields.includes('weight');
    const hasReps = factFields.includes('reps');

    if (hasWeight && hasReps) {
        parts.push(
            `${formatCount(set.weight, options.locale, 0, 1)} ${options.labels.weight} × ${formatCount(set.reps, options.locale, 0, 0)}`,
        );
    } else if (hasWeight) {
        parts.push(
            `${formatCount(set.weight, options.locale, 0, 1)} ${options.labels.weight}`,
        );
    } else if (hasReps) {
        parts.push(formatCount(set.reps, options.locale, 0, 0));
    }

    if (factFields.includes('distance')) {
        parts.push(
            `${formatCount(set.distance, options.locale, 2, 2)} ${options.labels.distance}`,
        );
    }

    if (factFields.includes('duration')) {
        parts.push(formatDuration(set.duration));
    }

    const meters = toCanonicalDistance(set.distance, options.distanceUnit);
    const speed =
        meters !== undefined && set.duration
            ? cardioSpeed(meters, set.duration, options.distanceUnit)
            : undefined;

    if (speed !== undefined) {
        parts.push(`${formatCount(speed, options.locale, 1, 1)} ${options.labels.speed}`);
    }

    return parts.filter(Boolean).join(' · ');
}

function factValue(set: SetMetricValues, field: SetMetricField): number | undefined {
    if (field === 'weight') {
        return set.weight;
    }

    if (field === 'reps') {
        return set.reps;
    }

    if (field === 'distance') {
        return set.distance;
    }

    return set.duration;
}

function planValue(set: SetMetricValues, field: SetMetricField): number | undefined {
    if (field === 'weight') {
        return set.plannedWeight;
    }

    if (field === 'reps') {
        return set.plannedReps;
    }

    if (field === 'distance') {
        return set.plannedDistance;
    }

    return set.plannedDuration;
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

function formatCount(
    value: number | undefined,
    locale: string,
    minFractionDigits: number,
    maxFractionDigits: number,
): string {
    if (!isPresentMetric(value) || value === undefined) {
        return '';
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: minFractionDigits,
        maximumFractionDigits: maxFractionDigits,
    }).format(value);
}
