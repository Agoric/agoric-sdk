/**
 * Key-value store interface for storing and retrieving configuration values.
 * This abstraction allows for different storage backends to be plugged in.
 */
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { makeKVStore } from '@agoric/internal/src/kv-store.js';
import type { TxStatus, TxType } from '@agoric/portfolio-api/src/resolver.js';
import type { Database as SQLiteDatabase } from 'better-sqlite3';
import Database from 'better-sqlite3';

type ResolvedTxStatus = Exclude<TxStatus, 'pending' | 'setup'>;

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

const getResolvedTxKey = (txId: `tx${number}`) => `${txId}.resolved`;

export const getResolvedTx = (
  store: KVStore,
  txId: `tx${number}`,
): ResolvedTxStatus | undefined =>
  store.get(getResolvedTxKey(txId)) as ResolvedTxStatus | undefined;

/**
 * Mark a tx as settled so future startups can skip the per-tx vstorage read.
 * Only `success` and `failed` are terminal;
 */
export const setResolvedTx = (
  store: KVStore,
  txId: `tx${number}`,
  status: ResolvedTxStatus,
): void => {
  store.set(getResolvedTxKey(txId), status);
};

export const deleteResolvedTx = (store: KVStore, txId: `tx${number}`): void => {
  store.delete(getResolvedTxKey(txId));
};

const getIgnoredTxKey = (txId: `tx${number}`) => `${txId}.ignored`;

export const getIgnoredTx = (
  store: KVStore,
  txId: `tx${number}`,
): TxType | undefined => store.get(getIgnoredTxKey(txId)) as TxType | undefined;

/**
 * Mark a tx as one the planner does not act on (its `type` is not in
 * `RESOLVER_SUPPORTED_TRANSACTIONS`).
 */
export const setIgnoredTx = (
  store: KVStore,
  txId: `tx${number}`,
  type: TxType,
): void => {
  store.set(getIgnoredTxKey(txId), type);
};

export const deleteIgnoredTx = (store: KVStore, txId: `tx${number}`): void => {
  store.delete(getIgnoredTxKey(txId));
};

/**
 * The outcome derived by a watcher but not yet confirmed as settled on-chain.
 * Persisted between the watcher resolving the outcome and the resolver
 * smart-wallet submission succeeding, so a restart in that window can skip
 * the (expensive) watcher and just retry the submission.
 */
export type DerivedOutcome = {
  status: ResolvedTxStatus;
  txHash?: string;
};

const getDerivedOutcomeKey = (txId: `tx${number}`) => `${txId}.derivedOutcome`;

export const getDerivedOutcome = (
  store: KVStore,
  txId: `tx${number}`,
): DerivedOutcome | undefined => {
  const raw = store.get(getDerivedOutcomeKey(txId));
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as DerivedOutcome;
  } catch (cause) {
    throw Error(`Invalid derivedOutcome for ${txId}: ${raw}`, { cause });
  }
};

export const setDerivedOutcome = (
  store: KVStore,
  txId: `tx${number}`,
  outcome: DerivedOutcome,
): void => {
  store.set(getDerivedOutcomeKey(txId), JSON.stringify(outcome));
};

export const deleteDerivedOutcome = (
  store: KVStore,
  txId: `tx${number}`,
): void => {
  store.delete(getDerivedOutcomeKey(txId));
};

const getConsumedTransferKey = (
  chainId: string | undefined,
  txHash: string,
  logIndex: number | undefined,
) => `consumedTransfer.${chainId}.${txHash}.${logIndex}`;

/**
 * Claim an on-chain transfer, identified by its unique `(chainId, txHash,
 * logIndex)` fingerprint, for a single pending tx. This ensures that one
 * physical transfer can never settle more than one pending tx: when several
 * pending txs share the same `(destination, amount)` (e.g. two 5-USDC CCTP
 * legs of one withdrawal), each must claim a distinct transfer before it may
 * settle.
 *
 * Returns `true` if the caller now owns the transfer (it was unclaimed, or
 * already claimed by the same `txId` — the re-watch-after-crash case), or
 * `false` if a different `txId` already claimed it, in which case the caller
 * must keep watching for the next matching transfer.
 *
 * Persisted so the "one transfer, one owner" guarantee survives planner
 * restarts and lookback rescans; without persistence a restart would let a
 * still-pending leg re-consume a transfer an already-settled leg had taken.
 */
export const claimTransferLog = (
  store: KVStore,
  chainId: string | undefined,
  txHash: string,
  logIndex: number | undefined,
  txId: `tx${number}`,
): boolean => {
  const key = getConsumedTransferKey(chainId, txHash, logIndex);
  const owner = store.get(key);
  if (owner !== undefined && owner !== txId) return false;
  store.set(key, txId);
  return true;
};
