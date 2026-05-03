import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private readonly language = 'ru';
  private translations: Record<string, unknown> = {};

  constructor(private readonly http: HttpClient) {
    this.loadTranslations();
  }

  translate(key: string): string {
    const value = key
      .split('.')
      .reduce<unknown>((current, part) => {
        if (current && typeof current === 'object' && part in current) {
          return (current as Record<string, unknown>)[part];
        }

        return undefined;
      }, this.translations);

    return typeof value === 'string' ? value : key;
  }

  private loadTranslations(): void {
    this.http.get<Record<string, unknown>>(`/i18n/${this.language}.json`).subscribe({
      next: (data) => {
        this.translations = data;
      },
      error: () => {
        this.translations = {};
      }
    });
  }
}
