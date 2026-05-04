import { Injectable } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'simple-sport-theme';
  private currentTheme: AppTheme = 'dark';

  constructor() {
    const saved = localStorage.getItem(this.storageKey) as AppTheme | null;
    this.currentTheme = saved === 'light' ? 'light' : 'dark';
    this.applyTheme();
  }

  getTheme(): AppTheme {
    return this.currentTheme;
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(this.storageKey, this.currentTheme);
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(this.currentTheme === 'dark' ? 'theme-dark' : 'theme-light');
  }
}
