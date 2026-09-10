declare module 'sql.js' {
    export interface Statement {
        bind(values?: Array<string | number | null | Uint8Array>): boolean;
        step(): boolean;
        getAsObject(): Record<string, unknown>;
        free(): boolean;
    }

    export class Database {
        constructor(data?: ArrayLike<number> | null);
        run(sql: string, params?: Array<string | number | null>): Database;
        exec(sql: string): unknown[];
        prepare(sql: string): Statement;
        close(): void;
    }

    export interface SqlJsStatic {
        Database: typeof Database;
    }

    export default function initSqlJs(config?: unknown): Promise<SqlJsStatic>;
}

declare module 'sql.js/dist/sql-asm.js' {
    import initSqlJs from 'sql.js';
    export default initSqlJs;
}
