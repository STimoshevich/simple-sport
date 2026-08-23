export type Guid = string;

export function createGuid(): Guid {
    return crypto.randomUUID();
}
