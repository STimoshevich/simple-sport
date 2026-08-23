import {
    ApplicationConfig,
    inject,
    provideAppInitializer,
    provideZonelessChangeDetection,
} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {provideAnimations} from '@angular/platform-browser/animations';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS} from '@angular/material/form-field';
import {provideNativeDateAdapter} from '@angular/material/core';
import {routes} from './app.routes';
import {SettingsStore} from './stores/settings.store';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideAppInitializer(() => {
            inject(SettingsStore);
        }),
        provideAnimations(),
        provideHttpClient(),
        provideRouter(routes),
        provideNativeDateAdapter(),
        {
            provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: {
                appearance: 'fill',
            },
        },
    ],
};
