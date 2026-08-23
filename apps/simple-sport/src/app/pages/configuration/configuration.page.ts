import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {SettingsService} from '@simple-sport/integration';
import {APP_PATHS} from '@simple-sport/shared';
import {TranslatePipe} from '../../pipes/translate.pipe';
import {SettingsSelectDialogComponent} from '../../dialogs/settings-select-dialog/settings-select-dialog.component';
import {ConfirmClearDataDialogComponent} from '../../dialogs/confirm-clear-data-dialog/confirm-clear-data-dialog.component';
import {ThemeStore} from '../../stores/theme.store';
import {UnitsStore} from '../../stores/units.store';
import {TranslateService} from '../../services/translate.service';
import {DistanceUnit, WeightUnit} from '../../utils/display-units';

@Component({
    standalone: true,
    selector: 'app-configuration-page',
    imports: [TranslatePipe, MatIconModule, RouterLink],
    templateUrl: './configuration.page.html',
    styleUrl: './configuration.page.css',
})
export class ConfigurationPageComponent {
    readonly paths = APP_PATHS;
    readonly themeStore = inject(ThemeStore);
    readonly unitsStore = inject(UnitsStore);
    private readonly settings = inject(SettingsService);

    constructor(
        private readonly translateService: TranslateService,
        private readonly dialog: MatDialog,
    ) {}

    get currentLanguage(): string {
        return this.translateService.getCurrentLanguage().toUpperCase();
    }

    openLanguagePopup(): void {
        this.dialog
            .open(SettingsSelectDialogComponent, {
                data: {
                    title: this.translateService.translate('APP.SETTINGS.LANGUAGE'),
                    options: [
                        {value: 'ru', label: 'RU'},
                        {value: 'en', label: 'EN'},
                    ],
                },
            })
            .afterClosed()
            .subscribe((value?: 'ru' | 'en') => {
                if (!value) {
                    return;
                }

                this.translateService.setLanguage(value);
            });
    }

    openThemePopup(): void {
        this.dialog
            .open(SettingsSelectDialogComponent, {
                data: {
                    title: this.translateService.translate('APP.SETTINGS.THEME'),
                    options: [
                        {
                            value: 'dark',
                            label: this.translateService.translate('APP.SETTINGS.DARK'),
                        },
                        {
                            value: 'light',
                            label: this.translateService.translate('APP.SETTINGS.LIGHT'),
                        },
                    ],
                },
            })
            .afterClosed()
            .subscribe((value?: 'dark' | 'light') => {
                if (!value) {
                    return;
                }

                this.themeStore.setTheme(value).subscribe();
            });
    }

    openWeightUnitPopup(): void {
        this.dialog
            .open(SettingsSelectDialogComponent, {
                data: {
                    title: this.translateService.translate('APP.SETTINGS.UNITS.WEIGHT'),
                    options: [
                        {
                            value: 'kg',
                            label: this.translateService.translate(
                                'APP.SETTINGS.UNITS.KG',
                            ),
                        },
                        {
                            value: 'lb',
                            label: this.translateService.translate(
                                'APP.SETTINGS.UNITS.LB',
                            ),
                        },
                    ],
                },
            })
            .afterClosed()
            .subscribe((value?: WeightUnit) => {
                if (value !== 'kg' && value !== 'lb') {
                    return;
                }

                this.unitsStore.setWeightUnit(value).subscribe();
            });
    }

    openDistanceUnitPopup(): void {
        this.dialog
            .open(SettingsSelectDialogComponent, {
                data: {
                    title: this.translateService.translate('APP.SETTINGS.UNITS.DISTANCE'),
                    options: [
                        {
                            value: 'km',
                            label: this.translateService.translate(
                                'APP.SETTINGS.UNITS.KM',
                            ),
                        },
                        {
                            value: 'mi',
                            label: this.translateService.translate(
                                'APP.SETTINGS.UNITS.MI',
                            ),
                        },
                    ],
                },
            })
            .afterClosed()
            .subscribe((value?: DistanceUnit) => {
                if (value !== 'km' && value !== 'mi') {
                    return;
                }

                this.unitsStore.setDistanceUnit(value).subscribe();
            });
    }

    clearData(): void {
        this.dialog
            .open(ConfirmClearDataDialogComponent)
            .afterClosed()
            .subscribe((confirmed?: boolean) => {
                if (!confirmed) {
                    return;
                }

                this.settings.clearDomainData().subscribe(() => {
                    window.location.reload();
                });
            });
    }
}
