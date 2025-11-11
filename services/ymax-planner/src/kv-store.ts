/**
 * Key-value store interface for storing and retrieving configuration values.
 * This abstraction allows for different storage backends to be plugged in.
 */
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { makeKVStore } from '@agoric/internal/src/kv-store.js';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import Database from 'better-sqlite3';

type SQLiteKeyValueStoreOptions = {
  trace: (...args: string[]) => void;
};

export const makeSQLiteKeyValueStore = (
  dbPath: string,
  options: SQLiteKeyValueStoreOptions,
): {
  db: SQLiteDatabase;
  kvStore: KVStore;
} => {
  // Note that the `dbPath` file is created if necessary:
  // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#new-databasepath-options
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  // We have no pre-mutation code; each write should be committed instantly.
  const noop = () => {};
  const kvStore = makeKVStore(db, noop, options.trace);
  return { db, kvStore };
};

const getTxBlockLowerBoundKey = (txId: `tx${number}`, scope?: string) =>
  `${txId}.blockLowerBound${scope ? `_${scope}` : ''}`;

/**
 * Get the highest block height that is known from prior searching to precede
 * inclusion of a transaction.
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param scope - if provided, identifies one of multiple independent searches
 * for the same txID and constrains behavior to that particular search (i.e.,
 * each scope has its own data that is entirely unrelated to the data for any
 * other scope)
 * @returns The block number, or undefined if not found
 */
export const getTxBlockLowerBound = (
  store: KVStore,
  txId: `tx${number}`,
  scope?: string,
): number | undefined => {
  const value = store.get(getTxBlockLowerBoundKey(txId, scope));
  if (value === undefined) return undefined;

  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) {
    throw Error(`Block height is not a nat: ${value}`);
  }
  return Number(value);
};

/**
 * Set the highest block height that is known from prior searching to precede
 * inclusion of a transaction.
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param block - The new lower bound
 * @param scope - if provided, identifies one of multiple independent searches
 * for the same txID and constrains behavior to that particular search (i.e.,
 * each scope has its own data that is entirely unrelated to the data for any
 * other scope)
 */
export const setTxBlockLowerBound = (
  store: KVStore,
  txId: `tx${number}`,
  block: number,
  scope?: string,
): void => {
  store.set(getTxBlockLowerBoundKey(txId, scope), String(block));
};

/**
 * Delete the stored block height for a transaction.
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param scope - if provided, identifies one of multiple independent searches
 * for the same txID and constrains behavior to that particular search (i.e.,
 * each scope has its own data that is entirely unrelated to the data for any
 * other scope)
 */
export const deleteTxBlockLowerBound = (
  store: KVStore,
  txId: `tx${number}`,
  scope?: string,
): void => {
  store.delete(getTxBlockLowerBoundKey(txId, scope));
};
