import {Injectable} from '@angular/core';
import {Capacitor} from '@capacitor/core';
import {
    CapacitorSQLite,
    SQLiteConnection,
    SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import {defineCustomElements as jeepSqlite} from 'jeep-sqlite/loader';
import {
    defer,
    first,
    firstValueFrom,
    from,
    map,
    Observable,
    shareReplay,
    switchMap,
} from 'rxjs';
import {SETTINGS_KEYS} from '@simple-sport/shared';
import {DOMAIN_TABLES, SCHEMA_VERSION, SQLITE_SCHEMA_STATEMENTS} from './sqlite-schema';
import {createTransactionRunner} from './sqlite-transaction';

export type SqliteValue = string | number | null;
export type SqliteRow = Record<string, unknown>;

export interface SqliteTransaction {
    query(sql: string, params?: SqliteValue[]): Observable<SqliteRow[]>;
    run(sql: string, params?: SqliteValue[]): Observable<void>;
    execute(sql: string): Observable<void>;
}

@Injectable({providedIn: 'root'})
export class SqliteStorageService {
    private sqlite = new SQLiteConnection(CapacitorSQLite);
    private runner?: ReturnType<typeof createTransactionRunner>;
    private readonly db$ = defer(() => this.openConnection()).pipe(
        shareReplay({bufferSize: 1, refCount: false}),
    );

    init(): Observable<void> {
        return this.db$.pipe(
            first(),
            map((): void => undefined),
        );
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
        return this.db$.pipe(
            first(),
            switchMap((db) => from(db.query(sql, params))),
            map((result) => (result?.values ?? []) as SqliteRow[]),
        );
    }

    run(sql: string, params: SqliteValue[] = []): Observable<void> {
        return this.db$.pipe(
            first(),
            switchMap((db) => from(db.run(sql, params))),
            map((): void => undefined),
        );
    }

    execute(sql: string): Observable<void> {
        return this.db$.pipe(
            first(),
            switchMap((db) => from(db.execute(sql))),
            map((): void => undefined),
        );
    }

    transaction<T>(work: (tx: SqliteTransaction) => Observable<T>): Observable<T> {
        return this.db$.pipe(
            first(),
            switchMap((db) =>
                from(
                    this.ensureRunner(db).run(() =>
                        firstValueFrom(work(this.bindTx(db))),
                    ),
                ),
            ),
        );
    }

    private bindTx(db: SQLiteDBConnection): SqliteTransaction {
        return {
            query: (sql, params = []) =>
                defer(() => db.query(sql, params)).pipe(
                    map((result) => (result?.values ?? []) as SqliteRow[]),
                ),
            run: (sql, params = []) =>
                defer(() => db.run(sql, params)).pipe(map((): void => undefined)),
            execute: (sql) =>
                defer(() => db.execute(sql)).pipe(map((): void => undefined)),
        };
    }

    private ensureRunner(
        db: SQLiteDBConnection,
    ): ReturnType<typeof createTransactionRunner> {
        this.runner ??= createTransactionRunner(async (sql) => {
            await db.run(sql);
        });
        return this.runner;
    }

    private async openConnection(): Promise<SQLiteDBConnection> {
        await this.ensureWebStore();

        const consistency = await this.sqlite.checkConnectionsConsistency();
        const hasConnection = (await this.sqlite.isConnection('simple_sport_db', false))
            .result;
        const db =
            consistency.result && hasConnection
                ? await this.sqlite.retrieveConnection('simple_sport_db', false)
                : await this.sqlite.createConnection(
                      'simple_sport_db',
                      false,
                      'no-encryption',
                      1,
                      false,
                  );

        await db.open();
        await db.execute(`
      CREATE TABLE IF NOT EXISTS app_kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
        await this.ensureSchema(db);
        return db;
    }

    private async ensureSchema(db: SQLiteDBConnection): Promise<void> {
        const versionRows = await db.query('SELECT value FROM app_kv WHERE key = ?', [
            SETTINGS_KEYS.SchemaVersion,
        ]);
        const current = Number(
            versionRows.values?.[0]?.['value'] ?? versionRows.values?.[0]?.['VALUE'] ?? 0,
        );

        if (current !== SCHEMA_VERSION) {
            await db.execute('PRAGMA foreign_keys = OFF;');

            for (const table of DOMAIN_TABLES) {
                await db.execute(`DROP TABLE IF EXISTS ${table};`);
            }

            await db.execute('PRAGMA foreign_keys = ON;');
        }

        for (const statement of SQLITE_SCHEMA_STATEMENTS) {
            await db.execute(statement);
        }

        await db.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [
            SETTINGS_KEYS.SchemaVersion,
            String(SCHEMA_VERSION),
        ]);
    }

    private async ensureWebStore(): Promise<void> {
        if (Capacitor.getPlatform() !== 'web') {
            return;
        }

        jeepSqlite(window);

        if (!document.querySelector('jeep-sqlite')) {
            document.body.appendChild(document.createElement('jeep-sqlite'));
        }

        await customElements.whenDefined('jeep-sqlite');
        await this.sqlite.initWebStore();
    }
}
