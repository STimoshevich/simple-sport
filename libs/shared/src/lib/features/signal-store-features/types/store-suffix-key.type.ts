/**
 * Приватный ключ с префиксом перед базовым именем:
 * `_<prefix>` для дефолтного имени, иначе `_<prefix><Name>`.
 */
export type StoreSuffixedKey<
    TPrefix extends string,
    TName extends string,
    TDefaultName extends string,
> = TName extends TDefaultName ? `_${TPrefix}` : `_${TPrefix}${Capitalize<TName>}`;

/**
 * Публичный ключ с префиксом перед базовым именем:
 * `<prefix>` для дефолтного имени, иначе `<prefix><Name>`.
 *
 */
export type StorePublicSuffixedKey<
    TPrefix extends string,
    TName extends string,
    TDefaultName extends string,
> = TName extends TDefaultName ? TPrefix : `${TPrefix}${Capitalize<TName>}`;

/**
 * Приватный ключ с суффиксом, идущим после базового имени:
 * `_<suffix>` для дефолтного имени, иначе `_<name><Suffix>`.
 */
export type StorePrivateTrailingSuffixedKey<
    TSuffix extends string,
    TName extends string,
    TDefaultName extends string,
> = TName extends TDefaultName ? `_${TSuffix}` : `_${TName}${Capitalize<TSuffix>}`;

/**
 * Публичный ключ с суффиксом, идущим после базового имени:
 * `<suffix>` для дефолтного имени, иначе `<name><Suffix>`.
 */
export type StorePublicTrailingSuffixedKey<
    TSuffix extends string,
    TName extends string,
    TDefaultName extends string,
> = TName extends TDefaultName ? TSuffix : `${TName}${Capitalize<TSuffix>}`;

/**
 * Публичный ключ с именем, вставленным между префиксом и суффиксом:
 * `<prefix><suffix>` для дефолтного имени, иначе `<prefix><Name><suffix>`.
 *
 * Суффикс используется как есть (без капитализации), так как обычно содержит
 * естественный регистр в составе имени (`ById`, `Id`, `Slug`).
 *
 * @example
 * // prefix='get', suffix='ById'
 * StorePublicInfixedKey<'get', 'ById', 'data', 'data'>     // 'getById'
 * StorePublicInfixedKey<'get', 'ById', 'proposal', 'data'> // 'getProposalById'
 */
export type StorePublicInfixedKey<
    TPrefix extends string,
    TSuffix extends string,
    TName extends string,
    TDefaultName extends string,
> = TName extends TDefaultName
    ? `${TPrefix}${TSuffix}`
    : `${TPrefix}${Capitalize<TName>}${TSuffix}`;

/**
 * Приватный ключ с именем, вставленным между префиксом и суффиксом:
 * `_<prefix><suffix>` для дефолтного имени, иначе `_<prefix><Name><suffix>`.
 */
export type StorePrivateInfixedKey<
    TPrefix extends string,
    TSuffix extends string,
    TName extends string,
    TDefaultName extends string,
> = TName extends TDefaultName
    ? `_${TPrefix}${TSuffix}`
    : `_${TPrefix}${Capitalize<TName>}${TSuffix}`;
