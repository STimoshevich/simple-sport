const eslint = require('@eslint/js');
const tseslintPlugin = require('@typescript-eslint/eslint-plugin');
const tseslintParser = require('@typescript-eslint/parser');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const angularParser = require('@angular-eslint/template-parser');
const nx = require('@nx/eslint-plugin');
const prettier = require('eslint-config-prettier');
const globals = require('globals');
module.exports = [
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'android/**',
            'ios/**',
            'coverage/**',
            '.angular/**',
            '.nx/**',
            '**/*.spec.ts',
        ],
    },
    ...nx.configs['flat/base'],
    eslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: false,
                    allowCircularSelfDependency: false,
                    banTransitiveDependencies: false,
                    checkNestedExternalImports: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
                    depConstraints: [
                        {
                            sourceTag: 'type:app',
                            onlyDependOnLibsWithTags: ['type:shared', 'type:integration'],
                            notDependOnLibsWithTags: ['type:app'],
                        },
                        {
                            sourceTag: 'type:shared',
                            onlyDependOnLibsWithTags: ['type:shared'],
                            notDependOnLibsWithTags: ['type:app', 'type:integration'],
                            bannedExternalImports: [
                                '@capacitor/*',
                                '@capacitor-community/*',
                            ],
                        },
                        {
                            sourceTag: 'type:integration',
                            onlyDependOnLibsWithTags: ['type:shared', 'type:integration'],
                            notDependOnLibsWithTags: ['type:app'],
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslintParser,
            parserOptions: {
                project: ['./tsconfig.eslint.json'],
                tsconfigRootDir: __dirname,
            },
            globals: {
                ...globals.browser,
            },
        },
        plugins: {
            '@angular-eslint': angular,
            '@typescript-eslint': tseslintPlugin,
        },
        rules: {
            ...tseslintPlugin.configs['recommended'].rules,
            '@angular-eslint/component-class-suffix': 'error',
            '@angular-eslint/directive-class-suffix': 'error',
            '@angular-eslint/component-selector': [
                'error',
                {type: 'element', prefix: 'app', style: 'kebab-case'},
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {type: 'attribute', prefix: 'app', style: 'camelCase'},
            ],
            '@angular-eslint/no-empty-lifecycle-method': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
            ],
            'no-unused-vars': 'off',
            // Базовое правило считает перегрузки функций повторным объявлением.
            // TS-версия понимает их корректно.
            '@typescript-eslint/no-redeclare': 'error',
            'no-redeclare': 'off',
            'no-restricted-syntax': [
                'error',
                {
                    selector:
                        "CallExpression[callee.property.name='slice'] > MemberExpression.callee[callee.property.name='toISOString']",
                    message:
                        'Не получайте календарную дату через toISOString().slice(). Используйте todayLocal() / toLocalDayKey() (Р-8).',
                },
            ],
        },
    },
    {
        files: ['libs/shared/src/lib/features/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['**/*.html'],
        languageOptions: {parser: angularParser},
        plugins: {'@angular-eslint/template': angularTemplate},
        rules: {
            ...angularTemplate.configs.recommended.rules,
            ...angularTemplate.configs.accessibility.rules,
        },
    },
    {
        files: [
            'eslint.config.js',
            'stylelint.config.cjs',
            '*.config.js',
            '*.config.cjs',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    prettier,
    {
        // После eslint-config-prettier: он помечает curly как 0 (условно совместимым),
        // поэтому активируем правило только после него. Опция 'all' с prettier не конфликтует —
        // prettier фигурные скобки у if/else/for/while не убирает.
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            curly: ['error', 'all'],
            // Prettier пустые строки не добавляет — только сохраняет. Разделение
            // операторов настраиваем здесь: пустая строка нужна только вокруг
            // блочных конструкций (if/for/while/switch/try) — их "слипание"
            // нечитаемо. Подряд идущие вызовы/объявления можно держать впритык
            // (правило их не требует, но и не запрещает вручную добавить).
            'padding-line-between-statements': [
                'error',
                {blankLine: 'always', prev: 'block-like', next: '*'},
                {blankLine: 'always', prev: '*', next: 'block-like'},
            ],
        },
    },
];
