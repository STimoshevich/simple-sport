import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from './pipes/translate.pipe';
import { TranslateService } from './services/translate.service';
import { ThemeService } from './services/theme.service';
import { SettingsSelectDialogComponent } from './dialogs/settings-select-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, MatTabsModule, MatButtonModule, MatSidenavModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(
    private readonly translateService: TranslateService,
    private readonly themeService: ThemeService,
    private readonly dialog: MatDialog
  ) {}

  openLanguagePopup(): void {
    this.dialog.open(SettingsSelectDialogComponent, {
      data: {
        title: this.translateService.translate('APP.SETTINGS.LANGUAGE'),
        options: [
          { value: 'ru', label: 'RU' },
          { value: 'en', label: 'EN' }
        ]
      }
    }).afterClosed().subscribe((value?: 'ru' | 'en') => {
      if (!value) return;
      this.translateService.setLanguage(value);
    });
  }

  openThemePopup(): void {
    this.dialog.open(SettingsSelectDialogComponent, {
      data: {
        title: this.translateService.translate('APP.SETTINGS.THEME'),
        options: [
          { value: 'dark', label: this.translateService.translate('APP.SETTINGS.DARK') },
          { value: 'light', label: this.translateService.translate('APP.SETTINGS.LIGHT') }
        ]
      }
    }).afterClosed().subscribe((value?: 'dark' | 'light') => {
      if (!value) return;
      if (value !== this.themeService.getTheme()) this.themeService.toggleTheme();
    });
  }
}
