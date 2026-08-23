import {computed, effect, inject} from '@angular/core';
import {signalStore, withHooks, withMethods, withProps} from '@ngrx/signals';
import {SettingsService} from '@simple-sport/integration';
import {
    AppSettings,
    AppTheme,
    DEFAULT_APP_SETTINGS,
    DistanceUnit,
    DISTANCE_UNIT_LABEL,
    toDisplayDistance,
    toDisplayWeight,
    WeightUnit,
    WEIGHT_UNIT_LABEL,
    withRxResourceState,
} from '@simple-sport/shared';
import {map, Observable} from 'rxjs';

function applyDocumentTheme(theme: 'dark' | 'light'): void {
    const root = document.documentElement;
    const themeClass = theme === 'dark' ? 'theme-dark' : 'theme-light';

    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(themeClass);
    root.style.colorScheme = theme;

    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(themeClass);

    const themeColor = getComputedStyle(root)
        .getPropertyValue('--mat-sys-surface')
        .trim();
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
            'content',
            themeColor || (theme === 'dark' ? '#121412' : '#f6f8f4'),
        );
}

function resolveTheme(theme: AppTheme): 'dark' | 'light' {
    if (theme === 'light' || theme === 'dark') {
        return theme;
    }

    return window.matchMedia?.('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
}

export const SettingsStore = signalStore(
    {providedIn: 'root'},
    withProps(() => ({
        _api: inject(SettingsService),
    })),
    withRxResourceState({
        name: 'appSettings',
        eager: true,
        loader: ({store}) => store._api.getSettings(),
    }),
    withProps((store) => {
        const settings = computed(() => store._appSettings() ?? DEFAULT_APP_SETTINGS);
        const units = computed(() => settings().units);
        const resolvedTheme = computed(() => resolveTheme(settings().theme));
        return {
            settings,
            theme: resolvedTheme,
            units,
            weightUnit: computed(() => units().weight),
            distanceUnit: computed(() => units().distance),
            weightUnitKey: computed(() => WEIGHT_UNIT_LABEL[units().weight]),
            distanceUnitKey: computed(() => DISTANCE_UNIT_LABEL[units().distance]),
        };
    }),
    withMethods((store) => {
        const persist = (partial: Partial<AppSettings>): Observable<void> => {
            return store._api.patch(partial).pipe(
                map(() => {
                    store._reloadAppSettings();
                }),
            );
        };

        return {
            setTheme(theme: AppTheme): Observable<void> {
                if (theme === 'light' || theme === 'dark') {
                    applyDocumentTheme(theme);
                }

                return persist({theme});
            },
            toggleTheme(): Observable<void> {
                const next = store.theme() === 'dark' ? 'light' : 'dark';
                applyDocumentTheme(next);
                return persist({theme: next});
            },
            setWeightUnit(weight: WeightUnit): Observable<void> {
                return persist({units: {...store.units(), weight}});
            },
            setDistanceUnit(distance: DistanceUnit): Observable<void> {
                return persist({units: {...store.units(), distance}});
            },
            formatWeight(value: number | undefined): number | undefined {
                return toDisplayWeight(value, store.weightUnit());
            },
            formatDistance(value: number | undefined): number | undefined {
                return toDisplayDistance(value, store.distanceUnit());
            },
        };
    }),
    withHooks({
        onInit(store) {
            effect(() => {
                applyDocumentTheme(store.theme());
            });
        },
    }),
);

export const ThemeStore = SettingsStore;
export const UnitsStore = SettingsStore;
