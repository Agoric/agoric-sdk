/**
 * Operator tools for inspecting and invalidating the planner's pendingTx
 * caches (`resolved` and `ignored`) stored in the SQLite KV store.
 *
 * Driven from `scripts/tx-tool.ts cache <subcommand>`.
 */
/* global process */

import { Fail, q } from '@endo/errors';

import {
  deleteIgnoredTx,
  deleteResolvedTx,
  deleteTxBlockLowerBound,
  getIgnoredTx,
  getResolvedTx,
  getTxBlockLowerBound,
  makeSQLiteKeyValueStore,
} from '../src/kv-store.ts';

type Env = Record<string, string | undefined>;

const openCache = (env: Env) => {
  const dbPath = env.SQLITE_DB_PATH || Fail`SQLITE_DB_PATH is required`;
  return makeSQLiteKeyValueStore(dbPath, { trace: () => {} });
};

const isTxId = (s: string): s is `tx${number}` => /^tx\d+$/.test(s);

const assertTxId = (txId: string): `tx${number}` => {
  isTxId(txId) || Fail`Invalid txId: ${q(txId)} (expected "tx<number>")`;
  return txId as `tx${number}`;
};

export const inspectCache = (
  txIdArg: string,
  { env = process.env }: { env?: Env } = {},
) => {
  const txId = assertTxId(txIdArg);
  const { db, kvStore } = openCache(env);
  try {
    const resolved = getResolvedTx(kvStore, txId);
    const ignored = getIgnoredTx(kvStore, txId);
    const blockLowerBound = getTxBlockLowerBound(kvStore, txId);
    console.log(`Cache state for ${txId}:`);
    console.log(`  resolved:        ${resolved ?? '(none)'}`);
    console.log(`  ignored:         ${ignored ?? '(none)'}`);
    console.log(`  blockLowerBound: ${blockLowerBound ?? '(none)'}`);
  } finally {
    db.close();
  }
};

export const deleteCachedTx = (
  txIdArg: string,
  { env = process.env }: { env?: Env } = {},
) => {
  const txId = assertTxId(txIdArg);
  const { db, kvStore } = openCache(env);
  try {
    const before = {
      resolved: getResolvedTx(kvStore, txId),
      ignored: getIgnoredTx(kvStore, txId),
      blockLowerBound: getTxBlockLowerBound(kvStore, txId),
    };
    deleteResolvedTx(kvStore, txId);
    deleteIgnoredTx(kvStore, txId);
    deleteTxBlockLowerBound(kvStore, txId);
    const removed = Object.entries(before)
      .filter(([_, v]) => v !== undefined)
      .map(([k]) => k);
    if (removed.length === 0) {
      console.log(`No cache entries found for ${txId}`);
    } else {
      console.log(`Removed cache entries for ${txId}: ${removed.join(', ')}`);
    }
  } finally {
    db.close();
  }
};

export const cacheStats = ({ env = process.env }: { env?: Env } = {}) => {
  const { db } = openCache(env);
  try {
    const tally = (suffix: 'resolved' | 'ignored') =>
      db
        .prepare(
          `SELECT value, COUNT(*) AS n FROM kvStore
           WHERE key LIKE ? GROUP BY value ORDER BY n DESC`,
        )
        .all(`%.${suffix}`) as Array<{ value: string; n: number }>;

    const print = (
      label: string,
      rows: Array<{ value: string; n: number }>,
    ) => {
      console.log(`${label}:`);
      if (rows.length === 0) {
        console.log('  (none)');
        return;
      }
      const total = rows.reduce((sum, { n }) => sum + n, 0);
      for (const { value, n } of rows) console.log(`  ${value}: ${n}`);
      console.log(`  total: ${total}`);
    };

    print('resolved', tally('resolved'));
    print('ignored', tally('ignored'));
  } finally {
    db.close();
  }
};
