// Базовые опции перенесены из @taiga-ui/prettier-config@0.359.0
// (https://github.com/taiga-family/configurations)
const attributeOptions = {
    attributeGroups: [
        '$ANGULAR_STRUCTURAL_DIRECTIVE',
        '$ANGULAR_ELEMENT_REF',
        '$ID',
        '$DEFAULT',
        '$CLASS',
        '$ANGULAR_ANIMATION',
        '$ANGULAR_ANIMATION_INPUT',
        '$ANGULAR_INPUT',
        '$ANGULAR_TWO_WAY_BINDING',
        '$ANGULAR_OUTPUT',
    ],
    attributeSort: 'ASC',
};

export default {
    $schema: 'https://json.schemastore.org/prettierrc',
    printWidth: 120,
    tabWidth: 4,
    useTabs: false,
    arrowParens: 'always',
    bracketSpacing: false,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'ignore',
    proseWrap: 'always',
    semi: true,
    singleAttributePerLine: true,
    singleQuote: true,
    trailingComma: 'all',
    // https://github.com/prettier/prettier-vscode/issues/2259#issuecomment-952950119
    // Чтоб не было ошибок - указываем плагины строками
    // attributeGroups/attributeSort заработают после:
    //   yarn add -D prettier-plugin-organize-attributes
    // и добавления 'prettier-plugin-organize-attributes' сюда
    plugins: ['stylelint-prettier'],
    overrides: [
        {
            files: '*.json',
            options: {
                tabWidth: 2,
                parser: 'json',
            },
        },
        {
            files: '*.less',
            options: {parser: 'less'},
        },
        {
            files: '*.scss',
            options: {parser: 'scss'},
        },
        {
            files: ['*.yml', '*.yaml'],
            options: {tabWidth: 2, parser: 'yaml'},
        },
        {
            files: '*.md',
            options: {tabWidth: 2, parser: 'markdown'},
        },
        {
            files: '*.html',
            options: {
                printWidth: 120,
                parser: 'angular',
                ...attributeOptions,
            },
        },
        {
            files: ['*.js', '*.ts'],
            options: {
                ...attributeOptions,
                printWidth: 90,
                parser: 'typescript',
            },
        },
    ],
};
