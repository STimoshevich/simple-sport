import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  standalone: true,
  selector: 'app-history-page',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h2>{{ 'APP.PAGES.HISTORY.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.HISTORY.DESCRIPTION' | translate }}</p>
    </section>
  `
})
export class HistoryPageComponent {}
