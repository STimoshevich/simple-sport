import {Routes} from '@angular/router';
import {APP_ROUTES} from '@simple-sport/shared';
import {CaloriesPageComponent} from './pages/calories/calories.page';
import {ConfigurationPageComponent} from './pages/configuration/configuration.page';
import {FoodProgressPageComponent} from './pages/food-progress/food-progress.page';
import {HistoryPageComponent} from './pages/history/history.page';
import {PlanningPageComponent} from './pages/planning/planning.page';
import {ProgressDetailPageComponent} from './pages/progress-detail/progress-detail.page';
import {ProgressHubPageComponent} from './pages/progress-hub/progress-hub.page';
import {ProgressPageComponent} from './pages/progress/progress.page';
import {ExercisesPageComponent} from './pages/exercises/exercises.page';
import {TimerPageComponent} from './pages/timer/timer.page';

const {
    PROGRESS: {
        _: PROGRESS,
        TRAINING: {_: TRAINING, DETAIL},
        FOOD,
    },
    CALORIES,
    HISTORY: {_: HISTORY, WORKOUT},
    PLANNING,
    TIMER,
    CONFIGURATION: {_: CONFIGURATION, EXERCISES},
} = APP_ROUTES;

export const routes: Routes = [
    {path: '', pathMatch: 'full', redirectTo: PROGRESS},
    {path: PROGRESS, component: ProgressHubPageComponent},
    {path: `${PROGRESS}/${TRAINING}`, component: ProgressPageComponent},
    {path: `${PROGRESS}/${TRAINING}/${DETAIL}`, component: ProgressDetailPageComponent},
    {path: `${PROGRESS}/${FOOD}`, component: FoodProgressPageComponent},
    {path: CALORIES, component: CaloriesPageComponent},
    {path: HISTORY, component: HistoryPageComponent},
    {path: PLANNING, component: PlanningPageComponent},
    {path: `${HISTORY}/${WORKOUT}`, redirectTo: HISTORY},
    {path: TIMER, component: TimerPageComponent},
    {path: CONFIGURATION, component: ConfigurationPageComponent},
    {path: `${CONFIGURATION}/${EXERCISES}`, component: ExercisesPageComponent},
    {path: '**', redirectTo: PROGRESS},
];
