module.exports = {
    extends: ['stylelint-config-standard', 'stylelint-prettier/recommended'],
    ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/.angular/**', '**/.nx/**', 'android/**', 'ios/**'],
    rules: {
        'selector-class-pattern': null,
        'selector-id-pattern': null,
        'custom-property-pattern': null,
        'keyframes-name-pattern': null,
        'no-descending-specificity': null,
        'selector-pseudo-element-no-unknown': [
            true,
            {
                ignorePseudoElements: ['ng-deep'],
            },
        ],
    },
    overrides: [
        {
            files: ['**/*.scss'],
            customSyntax: 'postcss-scss',
            extends: ['stylelint-config-standard-scss', 'stylelint-prettier/recommended'],
            rules: {
                'scss/at-extend-no-missing-placeholder': null,
                'scss/load-partial-extension': null,
            },
        },
    ],
};
