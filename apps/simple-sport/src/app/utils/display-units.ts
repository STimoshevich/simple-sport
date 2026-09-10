export {
    DEFAULT_DISPLAY_UNITS,
    DISTANCE_UNIT_LABEL,
    ENERGY_UNIT_LABEL,
    toCanonicalDistance,
    toCanonicalEnergy,
    toCanonicalWeight,
    toDisplayDistance,
    toDisplayEnergy,
    toDisplayWeight,
    WEIGHT_UNIT_LABEL,
    type DisplayUnits,
    type DistanceUnit,
    type EnergyUnit,
    type WeightUnit,
} from '@simple-sport/shared';

import {TrainingExerciseView, TrainingSetView} from '@simple-sport/integration';
import {
    toCanonicalDistance,
    toCanonicalWeight,
    toDisplayDistance,
    toDisplayWeight,
    type DisplayUnits,
} from '@simple-sport/shared';

export function toDisplaySet(set: TrainingSetView, units: DisplayUnits): TrainingSetView {
    return {
        ...set,
        weight: toDisplayWeight(set.weight, units.weight),
        plannedWeight: toDisplayWeight(set.plannedWeight, units.weight),
        distance: toDisplayDistance(set.distance, units.distance),
        plannedDistance: toDisplayDistance(set.plannedDistance, units.distance),
    };
}

export function toCanonicalSet(
    set: TrainingSetView,
    units: DisplayUnits,
): TrainingSetView {
    return {
        ...set,
        weight: toCanonicalWeight(set.weight, units.weight),
        plannedWeight: toCanonicalWeight(set.plannedWeight, units.weight),
        distance: toCanonicalDistance(set.distance, units.distance),
        plannedDistance: toCanonicalDistance(set.plannedDistance, units.distance),
    };
}

export function toDisplayWorkout(
    workout: TrainingExerciseView,
    units: DisplayUnits,
): TrainingExerciseView {
    const sets = (workout.sets ?? []).map((set) => toDisplaySet(set, units));
    const first = sets[0];
    return {
        ...workout,
        sets,
        weight: first?.weight ?? toDisplayWeight(workout.weight, units.weight),
        plannedWeight:
            first?.plannedWeight ?? toDisplayWeight(workout.plannedWeight, units.weight),
        distance: first?.distance ?? toDisplayDistance(workout.distance, units.distance),
        plannedDistance:
            first?.plannedDistance ??
            toDisplayDistance(workout.plannedDistance, units.distance),
    };
}

export function toCanonicalWorkout(
    workout: TrainingExerciseView,
    units: DisplayUnits,
): TrainingExerciseView {
    const sets = (workout.sets ?? []).map((set) => toCanonicalSet(set, units));
    const first = sets[0];
    return {
        ...workout,
        sets,
        weight: first?.weight ?? toCanonicalWeight(workout.weight, units.weight),
        plannedWeight:
            first?.plannedWeight ??
            toCanonicalWeight(workout.plannedWeight, units.weight),
        distance:
            first?.distance ?? toCanonicalDistance(workout.distance, units.distance),
        plannedDistance:
            first?.plannedDistance ??
            toCanonicalDistance(workout.plannedDistance, units.distance),
    };
}
