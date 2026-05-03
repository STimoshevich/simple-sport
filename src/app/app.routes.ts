import { Routes } from '@angular/router';
import { ConfigurationPageComponent } from './pages/configuration/configuration.page';
import { HistoryPageComponent } from './pages/history/history.page';
import { ProgressPageComponent } from './pages/progress/progress.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'progress' },
  { path: 'progress', component: ProgressPageComponent },
  { path: 'history', component: HistoryPageComponent },
  { path: 'configuration', component: ConfigurationPageComponent },
  { path: '**', redirectTo: 'progress' }
];
