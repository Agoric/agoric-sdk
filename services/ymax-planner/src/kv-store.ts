/**
 * Key-value store interface for storing and retrieving configuration values.
 * This abstraction allows for different storage backends to be plugged in.
 */
import type { KVStore } from '@agoric/internal';
import { makeKVStore } from '@agoric/internal';
import Database from 'better-sqlite3';

export type SQLiteKeyValueStoreOptions = {
  trace: (...args: string[]) => void;
  tableName?: string;
};

export const makeSQLiteKeyValueStore = (
  dbPath: string,
  options: SQLiteKeyValueStoreOptions,
): KVStore => {
  const { tableName = 'kv_store' } = options;

  // Note that the `dbPath` file is created if necessary:
  // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#new-databasepath-options
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  /**
   * @see https://github.com/Agoric/agoric-sdk/blob/a62e38f05bf0b676c708b7861b88b2b70b841469/packages/swing-store/src/swingStore.js#L274-L287
   * ensureTx is not required here since we want each write to the db
   * to be committed instantly
   */
  const emptyEnsure = () => null;
  return makeKVStore(db, emptyEnsure, options.trace, tableName);
};

const getResolverLastBlockKey = (txId: `tx${number}`, suffix?: string) =>
  `RESOLVER_LAST_BLOCK_${txId}${suffix ? `_${suffix}` : ''}`;

/**
 * Helper to get a tx's last searched block
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param suffix - Additional suffix to add to the end of the key. helps to differentiate
 * between two different searches on the same txID
 * @returns The block number, or undefined if not found
 */
export const getTxBlockLowerBound = async (
  store: KVStore,
  txId: `tx${number}`,
  suffix?: string,
): Promise<number | undefined> => {
  const value = await store.get(getResolverLastBlockKey(txId, suffix));
  if (value === undefined) return undefined;

  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) {
    throw Error(`Block height is not a nat: ${value}`);
  }
  return Number(value);
};

/**
 * Helper to set the tx's last searched block
 * @param store - The key-value store instance
 * @param txId - The transaction ID
 * @param block - The block number to add as value
 * @param suffix - Additional suffix to add to the end of the key. helps to differentiate
 * between two different searches on the same txID
 */
export const setTxBlockLowerBound = async (
  store: KVStore,
  txId: `tx${number}`,
  block: number,
  suffix?: string,
): Promise<void> => {
  await store.set(getResolverLastBlockKey(txId, suffix), String(block));
};
