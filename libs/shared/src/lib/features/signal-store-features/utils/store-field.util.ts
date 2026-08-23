import {StoreField} from '../types/store-field.type';

export function storeField<K extends PropertyKey, V>(key: K, value: V): StoreField<K, V> {
    return {[key]: value} as StoreField<K, V>;
}
