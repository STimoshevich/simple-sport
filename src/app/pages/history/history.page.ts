import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-history-page',
  template: `
    <section class="page">
      <h2>Прошедшие</h2>
      <p>Здесь будет история завершённых тренировок.</p>
    </section>
  `
})
export class HistoryPageComponent {}
