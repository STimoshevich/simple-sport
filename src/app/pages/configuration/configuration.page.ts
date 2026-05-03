import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-configuration-page',
  template: `
    <section class="page">
      <h2>Конфигурация</h2>
      <p>Здесь будут параметры приложения и профиля.</p>
    </section>
  `
})
export class ConfigurationPageComponent {}
