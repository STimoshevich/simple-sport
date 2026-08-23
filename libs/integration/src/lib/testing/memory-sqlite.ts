import {SETTINGS_KEYS} from '@simple-sport/shared';
import {defer, firstValueFrom, from, map, Observable, of} from 'rxjs';
import type {Database, SqlJsStatic} from 'sql.js';
import {SCHEMA_VERSION, SQLITE_SCHEMA_STATEMENTS} from '../sqlite-schema';
import type {SqliteRow, SqliteTransaction, SqliteValue} from '../sqlite-storage.service';
import {createTransactionRunner} from '../sqlite-transaction';

let sqlJs: Promise<SqlJsStatic> | undefined;

async function loadSqlJs(): Promise<SqlJsStatic> {
    sqlJs ??= import('sql.js/dist/sql-asm.js').then((mod) => {
        const init =
            (mod as {default?: (config?: unknown) => Promise<SqlJsStatic>}).default ??
            (mod as unknown as (config?: unknown) => Promise<SqlJsStatic>);
        return init();
    });
    return sqlJs;
}

function execParams(db: Database, sql: string, params: SqliteValue[] = []): SqliteRow[] {
    const stmt = db.prepare(sql);

    try {
        stmt.bind(params);
        const rows: SqliteRow[] = [];

        while (stmt.step()) {
            rows.push(stmt.getAsObject() as SqliteRow);
        }

        return rows;
    } finally {
        stmt.free();
    }
}

/**
 * In-memory SQLite with the same public surface as {@link SqliteStorageService}.
 * Used by repository integration tests (T-027).
 */
export class MemorySqliteStorage {
    private readonly runner: ReturnType<typeof createTransactionRunner>;
    private ready = false;

    private constructor(private readonly db: Database) {
        this.runner = createTransactionRunner(async (sql) => {
            this.db.exec(sql);
        });
    }

    static async create(): Promise<MemorySqliteStorage> {
        const SQL = await loadSqlJs();
        const storage = new MemorySqliteStorage(new SQL.Database());
        await firstValueFrom(storage.init());
        return storage;
    }

    init(): Observable<void> {
        if (this.ready) {
            return of(undefined);
        }

        this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);

        for (const statement of SQLITE_SCHEMA_STATEMENTS) {
            this.db.exec(statement);
        }

        this.db.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
            SETTINGS_KEYS.SchemaVersion,
            String(SCHEMA_VERSION),
        ]);
        this.ready = true;
        return of(undefined);
    }

    setItem(key: string, value: string): Observable<void> {
        return this.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
            key,
            value,
        ]);
    }

    getItem(key: string): Observable<string | null> {
        return this.query('SELECT value FROM app_kv WHERE key = ?', [key]).pipe(
            map((rows) => {
                const row = rows[0] as {value?: string} | undefined;
                return row?.value ?? null;
            }),
        );
    }

    query(sql: string, params: SqliteValue[] = []): Observable<SqliteRow[]> {
        return defer(() => of(execParams(this.db, sql, params)));
    }

    run(sql: string, params: SqliteValue[] = []): Observable<void> {
        return defer(() => {
            this.db.run(sql, params);
            return of(undefined);
        });
    }

    execute(sql: string): Observable<void> {
        return defer(() => {
            this.db.exec(sql);
            return of(undefined);
        });
    }

    transaction<T>(work: (tx: SqliteTransaction) => Observable<T>): Observable<T> {
        return defer(() =>
            from(this.runner.run(() => firstValueFrom(work(this.bindTx())))),
        );
    }

    private bindTx(): SqliteTransaction {
        return {
            query: (sql, params = []) =>
                defer(() => of(execParams(this.db, sql, params))),
            run: (sql, params = []) =>
                defer(() => {
                    this.db.run(sql, params);
                    return of(undefined);
                }),
            execute: (sql) =>
                defer(() => {
                    this.db.exec(sql);
                    return of(undefined);
                }),
        };
    }
}
