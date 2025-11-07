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
 * Note: this implementation uses better-sqlite which is synchronous (https://github.com/WiseLibs/better-sqlite3)
 * but the functions still use `async` since they implement the KeyValueStore interface
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

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      key_name TEXT PRIMARY KEY,
      key_value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    db.exec(createTableQuery);
  } catch (error) {
    console.error('Failed to initialize SQLite key-value store table:', error);
    throw error;
  }
  const getStmt = db.prepare(
    `SELECT key_value FROM ${tableName} WHERE key_name = ?`,
  );

  const setStmt = db.prepare(
    `INSERT INTO ${tableName} (key_name, key_value)
         VALUES (?, ?)
         ON CONFLICT(key_name) DO UPDATE SET
           key_value = excluded.key_value,
           updated_at = CURRENT_TIMESTAMP`,
  );

  const delStmt = db.prepare(`DELETE FROM ${tableName} WHERE key_name = ?`);

  const hasStmt = db.prepare(
    `SELECT 1 FROM ${tableName} WHERE key_name = ? LIMIT 1`,
  );

  return {
    async get(key: string): Promise<string | undefined> {
      const row = getStmt.get(key) as { key_value: string } | undefined;
      return row?.key_value;
    },

    async set(key: string, value: string): Promise<void> {
      setStmt.run(key, value);
    },

    async delete(key: string): Promise<void> {
      delStmt.run(key);
    },

    async has(key: string): Promise<boolean> {
      const row = hasStmt.get(key);
      return row !== undefined;
    },
  };
};

const getResolverLastBlockKey = (txId: `tx${number}`, suffix?: string) =>
  `RESOLVER_LAST_BLOCK_${txId}${suffix ? `_${suffix}` : ''}`;

/**
 * Helper to get the resolver's last active block from the store
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param suffix - Additional suffix to add to the end of the key
 * @returns The block number, or undefined if not found
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
 * Helper to set the resolver's last active block in the store
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
