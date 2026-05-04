import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  standalone: true,
  selector: 'app-configuration-page',
  imports: [TranslatePipe],
  templateUrl: './configuration.page.html'
})
export class ConfigurationPageComponent {}
