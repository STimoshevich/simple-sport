import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  standalone: true,
  selector: 'app-workout-detail-page',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h2>{{ 'APP.PAGES.WORKOUT_DETAIL.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.WORKOUT_DETAIL.DESCRIPTION' | translate }}</p>
    </section>
  `
})
export class WorkoutDetailPageComponent {}
