import {inject, Injectable} from '@angular/core';
import {AppSettings} from '@simple-sport/shared';
import {Observable} from 'rxjs';
import {SettingsRepository} from '../repositories';

/**
 * Публичный API настроек приложения поверх {@link SettingsRepository}.
 *
 * Репозитории — внутренняя деталь lib: потребители вне integration
 * работают только с этим сервисом.
 */
@Injectable({providedIn: 'root'})
export class SettingsService {
    private readonly settings = inject(SettingsRepository);

    getSettings(): Observable<AppSettings> {
        return this.settings.getSettings();
    }

    patch(partial: Partial<AppSettings>): Observable<void> {
        return this.settings.patch(partial);
    }

    /** Полная очистка доменных таблиц (сброс данных в настройках). */
    clearDomainData(): Observable<void> {
        return this.settings.clearDomainData();
    }
}
