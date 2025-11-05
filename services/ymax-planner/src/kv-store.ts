/**
 * Key-value store interface for storing and retrieving configuration values.
 * This abstraction allows for different storage backends to be plugged in.
 */
import Database from 'better-sqlite3';

export interface KeyValueStore {
  /**
   * Get a value from the store by key
   * @param key - The key to retrieve
   * @returns The value if found, undefined otherwise
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Set a value in the store
   * @param key - The key to set
   * @param value - The value to store
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Delete a value from the store
   * @param key - The key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists in the store
   * @param key - The key to check
   */
  has(key: string): Promise<boolean>;
}

export type SQLiteKeyValueStoreConfig = {
  dbPath: string;
  tableName?: string;
};

/**
 * SQLite implementation of KeyValueStore.
 * Stores key-value pairs in a SQLite database file.
 * Useful for production environments with persistent local storage.
 *
 * The table will be created automatically if it doesn't exist with the following schema:
 * - key_name: TEXT PRIMARY KEY
 * - key_value: TEXT NOT NULL
 * - updated_at: INTEGER (timestamp in milliseconds)
 *
 * Usage:
 * ```typescript
 * const kvStore = makeSQLiteKeyValueStore({
 *   dbPath: './data/kv-store.db',
 *   tableName: 'kv_store', // optional, defaults to 'kv_store'
 * });
 * ```
 */
export const makeSQLiteKeyValueStore = (
  config: SQLiteKeyValueStoreConfig,
): KeyValueStore => {
  const { dbPath, tableName = 'kv_store' } = config;

  const db = new Database(dbPath);

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      key_name TEXT PRIMARY KEY,
      key_value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `;

  try {
    db.exec(createTableQuery);
  } catch (error) {
    console.error('Failed to initialize SQLite key-value store table:', error);
    throw error;
  }

  return {
    async get(key: string): Promise<string | undefined> {
      const stmt = db.prepare(
        `SELECT key_value FROM ${tableName} WHERE key_name = ?`,
      );
      const row = stmt.get(key) as { key_value: string } | undefined;
      return row?.key_value;
    },

    async set(key: string, value: string): Promise<void> {
      const stmt = db.prepare(
        `INSERT INTO ${tableName} (key_name, key_value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key_name) DO UPDATE SET
           key_value = excluded.key_value,
           updated_at = excluded.updated_at`,
      );
      stmt.run(key, value, Date.now());
    },

    async delete(key: string): Promise<void> {
      const stmt = db.prepare(`DELETE FROM ${tableName} WHERE key_name = ?`);
      stmt.run(key);
    },

    async has(key: string): Promise<boolean> {
      const stmt = db.prepare(
        `SELECT 1 FROM ${tableName} WHERE key_name = ? LIMIT 1`,
      );
      const row = stmt.get(key);
      return row !== undefined;
    },
  };
};

const getResolverLastBlockKey = (txId: `tx${number}`, suffix?: string) =>
  `RESOLVER_LAST_BLOCK_${txId}${suffix ? `_${suffix}` : ''}`;

/**
 * Helper to get the resolver's last active time from the store
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param suffix - Additional suffix to add to the end of the key
 * @returns The timestamp in milliseconds, or undefined if not found
 */
export const getResolverLastActiveBlock = async (
  store: KeyValueStore,
  txId: `tx${number}`,
  suffix?: string,
): Promise<number | undefined> => {
  const value = await store.get(getResolverLastBlockKey(txId, suffix));
  if (value === undefined) return undefined;

  const timestamp = Number(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

/**
 * Helper to set the resolver's last active time in the store
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param block - The block number to add as value
 * @param suffix - Additional suffix to add to the end of the key
 */
export const setResolverLastActiveBlock = async (
  store: KeyValueStore,
  txId: `tx${number}`,
  block: number,
  suffix?: string,
): Promise<void> => {
  await store.set(getResolverLastBlockKey(txId, suffix), String(block));
};
