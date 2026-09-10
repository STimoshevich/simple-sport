export const APP_ROUTES = {
    PROGRESS: {
        _: 'progress',
        TRAINING: {
            _: 'training',
            DETAIL: ':name',
        },
        FOOD: 'food',
    },
    CALORIES: 'calories',
    HISTORY: {
        _: 'history',
        WORKOUT: 'workout/:id',
    },
    PLANNING: 'planning',
    TIMER: 'timer',
    CONFIGURATION: {
        _: 'configuration',
        EXERCISES: 'exercises',
    },
} as const;

const {
    PROGRESS: {
        _: PROGRESS,
        TRAINING: {_: TRAINING},
        FOOD,
    },
    CALORIES,
    HISTORY: {_: HISTORY},
    PLANNING,
    TIMER,
    CONFIGURATION: {_: CONFIGURATION, EXERCISES},
} = APP_ROUTES;

// Абсолютные пути для навигации (routerLink, Router.navigate)
export const APP_PATHS = {
    PROGRESS: `/${PROGRESS}`,
    PROGRESS_TRAINING: `/${PROGRESS}/${TRAINING}`,
    PROGRESS_FOOD: `/${PROGRESS}/${FOOD}`,
    CALORIES: `/${CALORIES}`,
    HISTORY: `/${HISTORY}`,
    PLANNING: `/${PLANNING}`,
    TIMER: `/${TIMER}`,
    CONFIGURATION: `/${CONFIGURATION}`,
    CONFIGURATION_EXERCISES: `/${CONFIGURATION}/${EXERCISES}`,
} as const;

// Имена route-параметров (paramMap.get(...)) из APP_ROUTES
export const APP_ROUTE_PARAMS = {
    TRAINING_NAME: 'name',
} as const;
