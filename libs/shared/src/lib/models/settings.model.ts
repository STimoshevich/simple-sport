export type AppLanguage = 'ru' | 'en';
export type AppTheme = 'light' | 'dark' | 'system';
export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'm' | 'km' | 'mi';
export type EnergyUnit = 'kcal' | 'kj';

export interface AppSettings {
    language: AppLanguage;
    theme: AppTheme;
    units: {
        weight: WeightUnit;
        distance: DistanceUnit;
        energy: EnergyUnit;
    };
    uiFeedFilters?: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
    language: 'ru',
    theme: 'system',
    units: {
        weight: 'kg',
        distance: 'km',
        energy: 'kcal',
    },
};

export const SETTINGS_KEYS = {
    Language: 'settings.language',
    Theme: 'settings.theme',
    Weight: 'settings.units.weight',
    Distance: 'settings.units.distance',
    Energy: 'settings.units.energy',
    FeedFilters: 'ui.feed.filters',
    SchemaVersion: 'schema_version',
    LegacyTheme: 'simple-sport-theme',
    LegacyUnits: 'simple-sport-units',
} as const;
