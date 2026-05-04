const tseslint = require('typescript-eslint');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const angularParser = require('@angular-eslint/template-parser');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname
      }
    },
    plugins: {
      '@angular-eslint': angular,
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      ...tseslint.configs.strictTypeChecked[0].rules,
      ...tseslint.configs.stylisticTypeChecked[0].rules,
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error'
    }
  },
  {
    files: ['**/*.html'],
    languageOptions: { parser: angularParser },
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      ...angularTemplate.configs.recommended.rules,
      ...angularTemplate.configs.accessibility.rules
    }
  },
  prettier
];
