import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-progress-page',
  template: `
    <section class="page">
      <h2>Прогресс</h2>
      <p>Здесь будет текущая динамика тренировок пользователя.</p>
    </section>
  `
})
export class ProgressPageComponent {}
