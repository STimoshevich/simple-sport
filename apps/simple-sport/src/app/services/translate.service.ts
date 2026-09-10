import {Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';

export type Language = 'ru' | 'en';

@Injectable({
    providedIn: 'root',
})
export class TranslateService {
    private readonly languageSignal = signal<Language>('ru');
    private readonly translationsSignal = signal<Record<string, unknown>>({});

    /** Текущие переводы — readonly-сигнал, чтобы consumers могли трекать изменения. */
    readonly translations = this.translationsSignal.asReadonly();

    constructor(private readonly http: HttpClient) {
        this.loadTranslations();
    }

    getCurrentLanguage(): Language {
        return this.languageSignal();
    }

    setLanguage(language: Language): void {
        if (this.languageSignal() === language) {
            return;
        }

        this.languageSignal.set(language);
        this.loadTranslations();
    }

    toggleLanguage(): void {
        this.setLanguage(this.languageSignal() === 'ru' ? 'en' : 'ru');
    }

    translate(key: string): string {
        const value = key.split('.').reduce<unknown>((current, part) => {
            if (current && typeof current === 'object' && part in current) {
                return (current as Record<string, unknown>)[part];
            }

            return undefined;
        }, this.translationsSignal());

        return typeof value === 'string' ? value : key;
    }

    private loadTranslations(): void {
        const language = this.languageSignal();
        this.http.get<Record<string, unknown>>(`/i18n/${language}.json`).subscribe({
            next: (data) => {
                if (this.languageSignal() !== language) {
                    return;
                }

                this.translationsSignal.set(data);
            },
            error: () => {
                if (this.languageSignal() !== language) {
                    return;
                }

                this.translationsSignal.set({});
            },
        });
    }
}
