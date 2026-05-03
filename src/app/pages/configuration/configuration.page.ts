import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  standalone: true,
  selector: 'app-configuration-page',
  imports: [TranslatePipe],
  template: `
    <section class="page">
      <h2>{{ 'APP.PAGES.CONFIGURATION.TITLE' | translate }}</h2>
      <p>{{ 'APP.PAGES.CONFIGURATION.DESCRIPTION' | translate }}</p>
    </section>
  `
})
export class ConfigurationPageComponent {}
