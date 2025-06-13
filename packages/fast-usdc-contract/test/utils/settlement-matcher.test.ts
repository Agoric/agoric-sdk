import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeHeapZone } from '@agoric/zone';
import type { TestFn } from 'ava';

import type {
  EvmHash,
  NobleAddress,
  PendingTx,
  PendingTxStatus,
} from '@agoric/fast-usdc/src/types.ts';
import { M } from '@endo/patterns';
import { PendingTxShape } from '@agoric/fast-usdc/src/type-guards.js';
import { makeSettlementMatcher } from '../../src/utils/settlement-matcher.ts';
import { MockCctpTxEvidences } from '../fixtures.ts';

const test = anyTest as TestFn<{
  store: MapStore<NobleAddress, PendingTx[]>;
  match: ReturnType<typeof makeSettlementMatcher>;
}>;

const ADDRESS = 'noble1address' as const;
let nextHash = 1;
const makeHash = (): EvmHash =>
  `0x${(nextHash += 1).toString(16).padStart(6, '0')}`;

const makePendingTx = (
  amount: bigint,
  addr: NobleAddress = ADDRESS,
): PendingTx => {
  const baseEvidence = {
    ...MockCctpTxEvidences.AGORIC_PLUS_AGORIC(),
    txHash: makeHash(),
    status: 'ADVANCED' as PendingTxStatus,
  };
  baseEvidence.tx.forwardingAddress = addr;
  baseEvidence.tx.amount = amount;
  return harden(baseEvidence);
};

test.beforeEach(t => {
  const zone = makeHeapZone();
  const pendingSettleTxs: MapStore<NobleAddress, PendingTx[]> = zone.mapStore(
    'PendingSettleTxs',
    {
      keyShape: M.string(),
      valueShape: M.arrayOf(PendingTxShape),
    },
  );
  t.context = {
    store: pendingSettleTxs,
    match: makeSettlementMatcher(),
  };
});

const exact = test.macro({
  title: (_title = '', want: bigint, pending: bigint[]) =>
    `exact match ${String(want)} in [${pending.join(',')}]`,
  exec: (t, want: bigint, pending: bigint[], expectRemaining: bigint[]) => {
    const { match, store } = t.context;
    for (const a of pending) {
      match.addPendingSettleTx(store, makePendingTx(a));
    }

    const got = match.matchAndDequeueSettlement(store, ADDRESS, want);
    t.deepEqual(
      got.map(tx => tx.tx.amount),
      [want],
    );

    if (expectRemaining.length) {
      t.deepEqual(
        store.get(ADDRESS).map(tx => tx.tx.amount),
        expectRemaining,
        'remaining queue',
      );
    } else {
      t.false(store.has(ADDRESS), 'queue cleared');
    }
  },
});

test(exact, 200n, [100n, 200n], [100n]);
test(exact, 100n, [100n, 200n], [200n]);
test(exact, 200n, [100n, 200n, 200n], [200n, 100n]);
test(exact, 200n, [200n], []);

const greedy = test.macro({
  title: (_ = '', target: bigint, pending: bigint[], expectMatch: bigint[]) =>
    `greedy ${target} -> [${expectMatch.join('+')}] from [${pending.join(',')}]`,
  exec: (
    t,
    target: bigint,
    pending: bigint[],
    expectMatch: bigint[],
    expectRemaining: bigint[],
  ) => {
    const { match, store } = t.context;
    for (const a of pending) {
      match.addPendingSettleTx(store, makePendingTx(a));
    }

    const got = match.matchAndDequeueSettlement(store, ADDRESS, target);
    t.deepEqual(
      got.map(tx => tx.tx.amount),
      expectMatch,
      'matched set',
    );

    if (expectRemaining.length) {
      t.deepEqual(
        store.get(ADDRESS).map(tx => tx.tx.amount),
        expectRemaining,
        'remaining queue',
      );
    } else {
      t.false(store.has(ADDRESS), 'queue cleared');
    }
  },
});

test(greedy, 500n, [200n, 100n, 300n], [300n, 200n], [100n]);
test(greedy, 300n, [200n, 100n, 300n], [300n], [200n, 100n]);
test(greedy, 350n, [250n, 150n, 200n], [200n, 150n], [250n]);
test(greedy, 150n, [100n, 50n, 25n], [100n, 50n], [25n]);
test(greedy, 150n, [100n, 30n, 10n, 10n], [100n, 30n, 10n, 10n], []);
test(greedy, 150n, [75n, 100n], [], [100n, 75n]);

test('no combination possible', t => {
  const { match, store } = t.context;
  for (const a of [7n, 5n]) {
    match.addPendingSettleTx(store, makePendingTx(a));
  }
  t.deepEqual(match.matchAndDequeueSettlement(store, ADDRESS, 6n), []);
});

test('address not found returns []', t => {
  const { match, store } = t.context;
  t.deepEqual(
    match.matchAndDequeueSettlement(store, 'noble1DOESNOTEXIST', 1n),
    [],
  );
});

test('empty queue returns []', t => {
  const { match, store } = t.context;
  match.addPendingSettleTx(store, makePendingTx(10n));
  // drain it
  void match.matchAndDequeueSettlement(store, ADDRESS, 10n);
  t.deepEqual(match.matchAndDequeueSettlement(store, ADDRESS, 1n), []);
});

test('exception thrown when greedy depth cap reached', t => {
  const { match, store } = t.context;
  for (const a of Array.from({ length: 30 }, () => 1n)) {
    match.addPendingSettleTx(store, makePendingTx(a));
  }
  t.throws(() => match.matchAndDequeueSettlement(store, ADDRESS, 26n), {
    message: 'MAX_MATCH_DEPTH: 25 exceeded for noble1address',
  });
  t.true(store.has(ADDRESS), 'queue unchanged when cap exceeded');
});

test('recipients isolated', t => {
  const { match, store } = t.context;
  const A: NobleAddress = 'noble1A';
  const B: NobleAddress = 'noble1B';
  match.addPendingSettleTx(store, makePendingTx(100n, A));
  match.addPendingSettleTx(store, makePendingTx(150n, B));

  t.deepEqual(match.matchAndDequeueSettlement(store, A, 100n).length, 1);
  t.deepEqual(match.matchAndDequeueSettlement(store, B, 150n).length, 1);
});

test('target 0 → [] (greedy early-out)', t => {
  const { match, store } = t.context;
  match.addPendingSettleTx(store, makePendingTx(10n));
  t.deepEqual(match.matchAndDequeueSettlement(store, ADDRESS, 0n), []);
});

test('empty list key → [] (greedy early-out)', t => {
  const { match, store } = t.context;
  const EMPTY: NobleAddress = 'noble1Empty';
  store.init(EMPTY, harden([]));
  t.deepEqual(match.matchAndDequeueSettlement(store, EMPTY, 5n), []);
});
