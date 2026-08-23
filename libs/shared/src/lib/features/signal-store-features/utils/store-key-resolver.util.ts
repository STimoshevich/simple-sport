import {StorePrivateKey} from '../types/store-private-key.type';
import {
    StorePrivateInfixedKey,
    StorePrivateTrailingSuffixedKey,
    StorePublicInfixedKey,
    StorePublicSuffixedKey,
    StorePublicTrailingSuffixedKey,
    StoreSuffixedKey,
} from '../types/store-suffix-key.type';
import {capitalizeFirstLetter} from './capitalize-first-letter.util';

/**
 * Резолвер имён полей для signal store feature.
 *
 * Поддерживаемые схемы:
 * - **suffixed** — префикс **до** имени: `_update`, `_updateProposal`;
 * - **trailingSuffixed** — суффикс **после** имени: `_meta`, `_proposalMeta`;
 * - **infixed** — имя **между** префиксом и суффиксом: `getById`, `getProposalById`;
 * - **private*** добавляет ведущий `_`, **public*** — нет.
 *
 * @example
 * const keys = storeKeyResolver('proposal', 'data');
 *
 * keys.privateSuffixed('update');               // '_updateProposal'
 * keys.publicSuffixed('update');                // 'updateProposal'
 * keys.privateTrailingSuffixed('meta');         // '_proposalMeta'
 * keys.publicTrailingSuffixed('meta');          // 'proposalMeta'
 * keys.publicInfixed('get', 'ById');            // 'getProposalById'
 * keys.publicInfixed('has', 'Id');              // 'hasProposalId'
 *
 * @example
 * const keys = storeKeyResolver('data', 'data');
 *
 * keys.publicInfixed('get', 'ById');            // 'getById'
 * keys.publicInfixed('has', 'Id');              // 'hasId'
 */
export function storeKeyResolver<TName extends string, TDefaultName extends string>(
    name: TName,
    defaultName: TDefaultName,
): {
    name: TName;
    capitalizedName: Capitalize<TName>;
    isDefault: boolean;
    privateKey: StorePrivateKey<TName>;
    privateSuffixed: <TPrefix extends string>(
        prefix: TPrefix,
    ) => StoreSuffixedKey<TPrefix, TName, TDefaultName>;
    publicSuffixed: <TPrefix extends string>(
        prefix: TPrefix,
    ) => StorePublicSuffixedKey<TPrefix, TName, TDefaultName>;
    privateTrailingSuffixed: <TSuffix extends string>(
        suffix: TSuffix,
    ) => StorePrivateTrailingSuffixedKey<TSuffix, TName, TDefaultName>;
    publicTrailingSuffixed: <TSuffix extends string>(
        suffix: TSuffix,
    ) => StorePublicTrailingSuffixedKey<TSuffix, TName, TDefaultName>;
    privateInfixed: <TPrefix extends string, TSuffix extends string>(
        prefix: TPrefix,
        suffix: TSuffix,
    ) => StorePrivateInfixedKey<TPrefix, TSuffix, TName, TDefaultName>;
    publicInfixed: <TPrefix extends string, TSuffix extends string>(
        prefix: TPrefix,
        suffix: TSuffix,
    ) => StorePublicInfixedKey<TPrefix, TSuffix, TName, TDefaultName>;
} {
    const capitalizedName = capitalizeFirstLetter(name) as Capitalize<TName>;
    const isDefault = String(name) === String(defaultName);

    return {
        name,
        capitalizedName,
        isDefault,
        privateKey: `_${name}` as StorePrivateKey<TName>,
        privateSuffixed: <TPrefix extends string>(prefix: TPrefix) =>
            (isDefault
                ? `_${prefix}`
                : `_${prefix}${capitalizedName}`) as StoreSuffixedKey<
                TPrefix,
                TName,
                TDefaultName
            >,
        publicSuffixed: <TPrefix extends string>(prefix: TPrefix) =>
            (isDefault
                ? prefix
                : `${prefix}${capitalizedName}`) as StorePublicSuffixedKey<
                TPrefix,
                TName,
                TDefaultName
            >,
        privateTrailingSuffixed: <TSuffix extends string>(suffix: TSuffix) =>
            (isDefault
                ? `_${suffix}`
                : `_${name}${capitalizeFirstLetter(suffix)}`) as StorePrivateTrailingSuffixedKey<
                TSuffix,
                TName,
                TDefaultName
            >,
        publicTrailingSuffixed: <TSuffix extends string>(suffix: TSuffix) =>
            (isDefault
                ? suffix
                : `${name}${capitalizeFirstLetter(suffix)}`) as StorePublicTrailingSuffixedKey<
                TSuffix,
                TName,
                TDefaultName
            >,
        privateInfixed: <TPrefix extends string, TSuffix extends string>(
            prefix: TPrefix,
            suffix: TSuffix,
        ) =>
            (isDefault
                ? `_${prefix}${suffix}`
                : `_${prefix}${capitalizedName}${suffix}`) as StorePrivateInfixedKey<
                TPrefix,
                TSuffix,
                TName,
                TDefaultName
            >,
        publicInfixed: <TPrefix extends string, TSuffix extends string>(
            prefix: TPrefix,
            suffix: TSuffix,
        ) =>
            (isDefault
                ? `${prefix}${suffix}`
                : `${prefix}${capitalizedName}${suffix}`) as StorePublicInfixedKey<
                TPrefix,
                TSuffix,
                TName,
                TDefaultName
            >,
    };
}
