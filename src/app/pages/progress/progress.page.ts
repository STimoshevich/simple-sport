import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  standalone: true,
  selector: 'app-progress-page',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h2>{{ 'APP.PAGES.PROGRESS.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.PROGRESS.DESCRIPTION' | translate }}</p>
    </section>
  `
})
export class ProgressPageComponent {}
