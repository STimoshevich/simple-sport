import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from './pipes/translate.pipe';
import { TranslateService } from './services/translate.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(private readonly translateService: TranslateService) {}

  toggleLanguage(): void {
    this.translateService.toggleLanguage();
  }

  getCurrentLanguage(): string {
    return this.translateService.getCurrentLanguage().toUpperCase();
  }
}
