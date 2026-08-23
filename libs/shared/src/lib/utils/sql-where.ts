export type SqlValue = string | number | null;

export interface SqlWhere {
    readonly sql: string;
    readonly params: SqlValue[];
    add(clause: string, ...values: SqlValue[]): SqlWhere;
    addIf(condition: unknown, clause: string, ...values: SqlValue[]): SqlWhere;
    addIn(column: string, values: readonly SqlValue[] | undefined): SqlWhere;
    build(): {sql: string; params: SqlValue[]};
}

export function sqlWhere(): SqlWhere {
    const parts: string[] = [];
    const params: SqlValue[] = [];

    const api: SqlWhere = {
        get sql(): string {
            return parts.length ? parts.join(' AND ') : '1 = 1';
        },
        get params(): SqlValue[] {
            return params;
        },
        add(clause: string, ...values: SqlValue[]): SqlWhere {
            parts.push(clause);
            params.push(...values);
            return api;
        },
        addIf(condition: unknown, clause: string, ...values: SqlValue[]): SqlWhere {
            if (
                condition === undefined ||
                condition === null ||
                condition === false ||
                condition === ''
            ) {
                return api;
            }

            if (Array.isArray(condition) && condition.length === 0) {
                return api;
            }

            return api.add(clause, ...values);
        },
        addIn(column: string, values: readonly SqlValue[] | undefined): SqlWhere {
            if (!values?.length) {
                return api;
            }

            const placeholders = values.map(() => '?').join(', ');
            return api.add(`${column} IN (${placeholders})`, ...values);
        },
        build(): {sql: string; params: SqlValue[]} {
            return {
                sql: parts.length ? parts.join(' AND ') : '1 = 1',
                params: [...params],
            };
        },
    };

    return api;
}
