import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeHeapZone } from '@agoric/zone';
import {
  type NobleAddress,
  type PendingTx,
} from '@agoric/fast-usdc/src/types.ts';
import { M } from '@endo/patterns';
import { PendingTxShape } from '@agoric/fast-usdc/src/type-guards.js';
import type { TestFn } from 'ava';
import { makeSettlementMatching } from '../../src/utils/settlement-matching.ts';
import { MockCctpTxEvidences } from '../fixtures.ts';

const test = anyTest as TestFn<{
  zone: ReturnType<typeof makeHeapZone>;
  pendingSettleTxs: MapStore<NobleAddress, PendingTx[]>;
  settlementMatching: ReturnType<typeof makeSettlementMatching>;
}>;

test.beforeEach(t => {
  const zone = makeHeapZone();

  const pendingSettleTxs: MapStore<NobleAddress, PendingTx[]> = zone.mapStore(
    'PendingSettleTxsByNFA',
    {
      keyShape: M.string(),
      valueShape: M.arrayOf(PendingTxShape),
    },
  );

  const settlementMatching = makeSettlementMatching(pendingSettleTxs);

  t.context = {
    zone,
    pendingSettleTxs,
    settlementMatching,
  };
});

// Helper function to create mock pending transactions with specified amounts
const createMockPendingTx = (
  amount: bigint,
  forwardingAddress: NobleAddress = 'noble1address',
): PendingTx => {
  const baseEvidence = MockCctpTxEvidences.AGORIC_PLUS_AGORIC();
  baseEvidence.tx.amount = amount;
  baseEvidence.tx.forwardingAddress = forwardingAddress;
  return { ...baseEvidence, status: 'ADVANCED' };
};

// Test macro for exact match scenario
const exactMatchScenario = test.macro({
  title: (_, settleAmount: bigint, pendingAmounts: bigint[]) =>
    `exact match: settle ${settleAmount} from pending [${pendingAmounts.join(', ')}]`,
  exec: (t, settleAmount: bigint, pendingAmounts: bigint[]) => {
    const { settlementMatching, pendingSettleTxs } = t.context;
    const { addPendingSettleTx, matchSettlement } = settlementMatching;

    // Add all pending transactions
    for (let i = 0; i < pendingAmounts.length; i += 1) {
      addPendingSettleTx(createMockPendingTx(pendingAmounts[i]));
    }

    // Perform settlement match
    const toSettle = matchSettlement('noble1address', settleAmount);

    // Verify the match
    t.is(toSettle.length, 1, 'should find exactly one matching transaction');
    t.is(toSettle[0].tx.amount, settleAmount, 'should match the exact amount');

    // Verify the remaining transactions
    const remaining = pendingSettleTxs.get('noble1address');
    t.is(
      remaining.length,
      pendingAmounts.length - 1,
      'should have one less transaction remaining',
    );
    t.false(
      remaining.some(tx => tx.tx.amount === settleAmount),
      'matched transaction should be removed from pending list',
    );
  },
});

// Test macro for binary insertion correctness
const binaryInsertionScenario = test.macro({
  title: () => 'binary search insertion maintains correct order',
  exec: t => {
    const { settlementMatching, pendingSettleTxs } = t.context;
    const { addPendingSettleTx } = settlementMatching;

    // Add transactions in non-sorted order
    const amounts = [50n, 200n, 100n, 300n, 75n];
    for (let i = 0; i < amounts.length; i += 1) {
      addPendingSettleTx(createMockPendingTx(amounts[i]));
    }

    // Get all transactions and verify they're sorted largest to smallest
    const transactions = pendingSettleTxs.get('noble1address');

    // Expected order is [300, 200, 100, 75, 50]
    const expectedOrder = [300n, 200n, 100n, 75n, 50n];

    for (let i = 0; i < expectedOrder.length; i += 1) {
      t.is(
        transactions[i].tx.amount,
        expectedOrder[i],
        `transaction at position ${i} should have amount ${expectedOrder[i]}`,
      );
    }
  },
});

// Test macro for multi-transaction matching
const multiMatchScenario = test.macro({
  title: (
    _,
    settleAmount: bigint,
    pendingAmounts: bigint[],
    expectedMatchCount: number,
  ) =>
    `multi-transaction match: settle ${settleAmount} from ${expectedMatchCount} of [${pendingAmounts.join(', ')}]`,
  exec: (
    t,
    settleAmount: bigint,
    pendingAmounts: bigint[],
    expectedMatchCount: number,
  ) => {
    const { settlementMatching, pendingSettleTxs } = t.context;
    const { addPendingSettleTx, matchSettlement } = settlementMatching;

    // Add all pending transactions
    for (let i = 0; i < pendingAmounts.length; i += 1) {
      addPendingSettleTx(createMockPendingTx(pendingAmounts[i]));
    }

    // Perform settlement match
    const toSettle = matchSettlement('noble1address', settleAmount);

    // Verify the match count
    t.is(
      toSettle.length,
      expectedMatchCount,
      `should find ${expectedMatchCount} matching transactions`,
    );

    // Calculate the sum to verify it matches the target
    const sum = toSettle.reduce((acc, tx) => acc + tx.tx.amount, 0n);
    t.is(
      sum,
      settleAmount,
      'the sum of matched transactions should equal the settlement amount',
    );

    // Verify the remaining transactions count
    const remaining = pendingSettleTxs.get('noble1address');
    t.is(
      remaining.length,
      pendingAmounts.length - expectedMatchCount,
      `should have ${pendingAmounts.length - expectedMatchCount} transactions remaining`,
    );
  },
});

// Test macro for no match scenarios
const noMatchScenario = test.macro({
  title: (_, settleAmount: bigint, pendingAmounts: bigint[]) =>
    `no match: settle ${settleAmount} finds no match in [${pendingAmounts.join(', ')}]`,
  exec: (t, settleAmount: bigint, pendingAmounts: bigint[]) => {
    const { settlementMatching, pendingSettleTxs } = t.context;
    const { addPendingSettleTx, matchSettlement } = settlementMatching;

    // Add all pending transactions if there are any
    for (let i = 0; i < pendingAmounts.length; i += 1) {
      addPendingSettleTx(createMockPendingTx(pendingAmounts[i]));
    }

    // Perform settlement match
    const toSettle = matchSettlement('noble1address', settleAmount);

    // Verify no match found
    t.is(toSettle.length, 0, 'should find no matching transactions');

    // Only verify remaining transactions if we added any
    if (pendingAmounts.length > 0) {
      const remaining = pendingSettleTxs.get('noble1address');
      t.is(
        remaining.length,
        pendingAmounts.length,
        'should still have all transactions',
      );
    }
  },
});

// Run the macro tests with various scenarios

// 1. Exact match scenarios
test(exactMatchScenario, 300n, [100n, 200n, 300n]);
test(exactMatchScenario, 100n, [100n, 200n, 300n]);
test(exactMatchScenario, 200n, [100n, 200n, 300n]);

// 2. Binary insertion correctness
test(binaryInsertionScenario);

// 3. Multi-transaction match scenarios
test(multiMatchScenario, 300n, [100n, 200n, 50n, 150n], 2); // Match 200n + 100n
test(multiMatchScenario, 350n, [100n, 200n, 50n, 150n], 2); // Match 200n + 150n
test(multiMatchScenario, 175n, [100n, 50n, 25n, 200n], 3); // Match 100n + 50n + 25n

// 4. No match scenarios
test(noMatchScenario, 150n, [100n, 200n]);
test(noMatchScenario, 400n, [100n, 200n, 50n]);
test(noMatchScenario, 100n, []);

// Additional standalone tests
test('should handle empty pending transactions list', t => {
  const { settlementMatching } = t.context;
  const { matchSettlement } = settlementMatching;

  // Attempt to match a settlement with no pending transactions
  const toSettle = matchSettlement('noble1address', 100n);

  t.is(toSettle.length, 0, 'should find no matching transactions');
});

test('should handle multiple recipients independently', t => {
  const { settlementMatching, pendingSettleTxs } = t.context;
  const { addPendingSettleTx, matchSettlement } = settlementMatching;

  // Add transactions for two different recipients
  const address1 = 'noble1address1';
  const address2 = 'noble1address2';

  // Add to first recipient
  addPendingSettleTx(createMockPendingTx(100n, address1));
  addPendingSettleTx(createMockPendingTx(200n, address1));

  // Add to second recipient
  addPendingSettleTx(createMockPendingTx(150n, address2));
  addPendingSettleTx(createMockPendingTx(250n, address2));

  // Match for first recipient
  const toSettle1 = matchSettlement(address1, 100n);
  t.is(toSettle1.length, 1, 'should match one transaction for first recipient');

  // Match for second recipient
  const toSettle2 = matchSettlement(address2, 250n);
  t.is(
    toSettle2.length,
    1,
    'should match one transaction for second recipient',
  );

  // Verify remaining transactions for both recipients
  t.is(
    pendingSettleTxs.get(address1).length,
    1,
    'should have 1 transaction remaining for first recipient',
  );
  t.is(
    pendingSettleTxs.get(address2).length,
    1,
    'should have 1 transaction remaining for second recipient',
  );
});

test('should prioritize exact match over combination of smaller transactions', t => {
  const { settlementMatching } = t.context;
  const { addPendingSettleTx, matchSettlement } = settlementMatching;

  // Add transactions with an interesting pattern
  addPendingSettleTx(createMockPendingTx(300n));
  addPendingSettleTx(createMockPendingTx(100n));
  addPendingSettleTx(createMockPendingTx(200n));

  // Attempt to match 300 - should match the 300 transaction directly
  // instead of combining 100 + 200
  const toSettle = matchSettlement('noble1address', 300n);

  t.is(toSettle.length, 1, 'should match one transaction');
  t.is(
    toSettle[0].tx.amount,
    300n,
    'should match the 300n transaction directly',
  );
});
