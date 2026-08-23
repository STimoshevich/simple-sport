import {patchState, signalStore, withMethods, withState} from '@ngrx/signals';

export const DATA_DOMAIN = {
    Settings: 'settings',
    NutritionGoal: 'nutritionGoal',
    Exercise: 'exercise',
    Training: 'training',
    TrainingSet: 'trainingSet',
    DayNote: 'dayNote',
    Template: 'template',
    Dish: 'dish',
    MealCategory: 'mealCategory',
    MealGroup: 'mealGroup',
    MealEntry: 'mealEntry',
} as const;

export type DataDomain = (typeof DATA_DOMAIN)[keyof typeof DATA_DOMAIN];

export const DataRevisionStore = signalStore(
    {providedIn: 'root'},
    withState({
        revisions: {} as Record<DataDomain, number>,
        lastOrigin: undefined as string | undefined,
    }),
    withMethods((store) => ({
        bump(domains: readonly DataDomain[], origin?: string): void {
            const next = {...store.revisions()};

            for (const domain of domains) {
                next[domain] = (next[domain] ?? 0) + 1;
            }

            patchState(store, {revisions: next, lastOrigin: origin});
        },
        keyOf(...domains: DataDomain[]): string {
            const revisions = store.revisions();
            return domains.map((domain) => String(revisions[domain] ?? 0)).join(':');
        },
    })),
);
