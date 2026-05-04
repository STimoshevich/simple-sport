import { Injectable } from '@angular/core';
import { SQLiteConnection, CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';

@Injectable({ providedIn: 'root' })
export class SqliteStorageService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db?: SQLiteDBConnection;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    this.db = await this.sqlite.createConnection('simple_sport_db', false, 'no-encryption', 1, false);
    await this.db.open();
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS app_kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    this.initialized = true;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.init();
    await this.db?.run('INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)', [key, value]);
  }

  async getItem(key: string): Promise<string | null> {
    await this.init();
    const result = await this.db?.query('SELECT value FROM app_kv WHERE key = ?', [key]);
    const row = result?.values?.[0] as { value?: string } | undefined;
    return row?.value ?? null;
  }
}
