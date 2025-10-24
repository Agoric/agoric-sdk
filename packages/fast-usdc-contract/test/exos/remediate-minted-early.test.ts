import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeHeapZone } from '@agoric/zone';
import type { TestFn } from 'ava';

import { PendingTxStatus } from '@agoric/fast-usdc/src/constants.js';
import type {
  EvmHash,
  NobleAddress,
  PendingTx,
} from '@agoric/fast-usdc/src/types.js';
import { M } from '@endo/patterns';
import { PendingTxShape } from '@agoric/fast-usdc/src/type-guards.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import { asMultiset } from '../../src/utils/store.js';

const test = anyTest as TestFn<{}>;

const ADDRESS = 'noble1address' as const;

const makeHash = (n: number): EvmHash =>
  `0x${n.toString(16).padStart(6, '0')}`;

/**
 * Create a minimal PendingTx for testing
 */
const makePendingTx = (
  amount: bigint,
  addr: NobleAddress = ADDRESS,
  hash: EvmHash = makeHash(1),
): PendingTx => {
  const baseEvidence = {
    ...MockCctpTxEvidences.AGORIC_PLUS_AGORIC(),
    txHash: hash,
    status: PendingTxStatus.Advanced,
  };
  baseEvidence.tx.forwardingAddress = addr;
  baseEvidence.tx.amount = amount;
  return harden(baseEvidence);
};

/**
 * Test the core remediate logic in isolation:
 * - Pending advanced tx of amount 100n
 * - MintedEarly entry of amount 110n
 * - Should disburse the pending tx for amount 100n
 */
test('remediateMintedEarly - disburse smaller pending tx from larger minted amount', t => {
  const zone = makeHeapZone();
  const { brand: USDC } = makeIssuerKit('USDC');

  // Create a minimal fake statusManager
  const pendingStore: MapStore<NobleAddress, PendingTx[]> = zone.mapStore(
    'PendingSettleTxs',
    {
      keyShape: M.string(),
      valueShape: M.arrayOf(PendingTxShape),
    },
  );

  const pendingTx = makePendingTx(100n, ADDRESS, makeHash(1));
  pendingStore.init(ADDRESS, harden([pendingTx]));

  const disburseCalls: Array<{
    txHash: EvmHash;
    amount: bigint;
    recipient: string;
  }> = [];

  const fakeStatusManager = {
    lookupPendingByAddress(nfa: NobleAddress): PendingTx[] {
      if (!pendingStore.has(nfa)) {
        return harden([]);
      }
      return harden([...pendingStore.get(nfa)]);
    },
    matchAndDequeueSettlement(
      nfa: NobleAddress,
      amount: bigint,
    ): PendingTx[] {
      if (!pendingStore.has(nfa)) return harden([]);
      const list = pendingStore.get(nfa);
      const ix = list.findIndex(tx => tx.tx.amount === amount);
      if (ix >= 0) {
        const match = list[ix];
        if (list.length > 1) {
          const remaining = [...list.slice(0, ix), ...list.slice(ix + 1)];
          pendingStore.set(nfa, harden(remaining));
        } else {
          pendingStore.delete(nfa);
        }
        return harden([match]);
      }
      return harden([]);
    },
  };

  const fakeSelf = {
    disburse(txHash: EvmHash, amount: { value: bigint }, recipient: string) {
      disburseCalls.push({ txHash, amount: amount.value, recipient });
    },
  };

  // Create mintedEarly multiset with entry of 110n
  const mintedEarly: MapStore<string, number> = zone.mapStore('mintedEarly');
  const makeMintedEarlyKey = (addr: NobleAddress, amount: bigint): string =>
    `pendingTx:${JSON.stringify([addr, String(amount)])}`;
  
  const key110 = makeMintedEarlyKey(ADDRESS, 110n);
  asMultiset(mintedEarly).add(key110);

  // Run the remediate logic
  const minUusdc = 100n;
  const parseMintedEarlyKey = (
    key: ReturnType<typeof makeMintedEarlyKey>,
  ): { address: NobleAddress; amount: bigint } => {
    const [address, amount] = JSON.parse(key.split(':')[1]);
    return harden({ address, amount: BigInt(amount) });
  };

  // Execute the remediation algorithm
  const batches = mintedEarly.entries();
  for (const [key, count] of batches) {
    const { address, amount: mintedAmount } = parseMintedEarlyKey(key);

    if (mintedAmount < minUusdc) {
      continue;
    }

    for (let i = 0; i < count; i += 1) {
      const allPending = fakeStatusManager.lookupPendingByAddress(address);
      const advancedPending = allPending.filter(
        tx => tx.status === PendingTxStatus.Advanced,
      );

      if (advancedPending.length === 0) {
        continue;
      }

      const sortedPending = advancedPending.sort(
        (a, b) => Number(a.tx.amount - b.tx.amount),
      );

      let remainingMinted = mintedAmount;
      const toDisburse = [];

      for (const pending of sortedPending) {
        if (pending.tx.amount <= remainingMinted) {
          toDisburse.push(pending);
          remainingMinted -= pending.tx.amount;
        }
      }

      if (toDisburse.length > 0) {
        for (const pending of toDisburse) {
          const dequeuedTxs = fakeStatusManager.matchAndDequeueSettlement(
            address,
            pending.tx.amount,
          );

          for (const p of dequeuedTxs) {
            const fullValue = AmountMath.make(USDC, p.tx.amount);
            fakeSelf.disburse(p.txHash, fullValue, p.aux.recipientAddress);
          }
        }
      }

      asMultiset(mintedEarly).remove(key);
    }
  }

  // Assertions
  t.is(disburseCalls.length, 1, 'should have called disburse once');
  t.is(disburseCalls[0].txHash, makeHash(1), 'should disburse correct txHash');
  t.is(disburseCalls[0].amount, 100n, 'should disburse correct amount');
  t.is(
    disburseCalls[0].recipient,
    pendingTx.aux.recipientAddress,
    'should disburse to correct recipient',
  );

  // Verify pending store is empty (tx was dequeued)
  t.false(pendingStore.has(ADDRESS), 'pending tx should be dequeued');

  // Verify mintedEarly key was removed
  t.false(mintedEarly.has(key110), 'mintedEarly key should be removed');
});

/**
 * Test multiple pending txs with greedy ascending sort
 */
test('remediateMintedEarly - greedy ascending sort matches multiple txs', t => {
  const zone = makeHeapZone();
  const { brand: USDC } = makeIssuerKit('USDC');

  const pendingStore: MapStore<NobleAddress, PendingTx[]> = zone.mapStore(
    'PendingSettleTxs',
    {
      keyShape: M.string(),
      valueShape: M.arrayOf(PendingTxShape),
    },
  );

  // Create pending txs: 30n, 50n, 80n (out of order to test sorting)
  const pending30 = makePendingTx(30n, ADDRESS, makeHash(1));
  const pending50 = makePendingTx(50n, ADDRESS, makeHash(2));
  const pending80 = makePendingTx(80n, ADDRESS, makeHash(3));
  pendingStore.init(ADDRESS, harden([pending80, pending30, pending50]));

  const disburseCalls: Array<{
    txHash: EvmHash;
    amount: bigint;
  }> = [];

  const fakeStatusManager = {
    lookupPendingByAddress(nfa: NobleAddress): PendingTx[] {
      if (!pendingStore.has(nfa)) {
        return harden([]);
      }
      return harden([...pendingStore.get(nfa)]);
    },
    matchAndDequeueSettlement(
      nfa: NobleAddress,
      amount: bigint,
    ): PendingTx[] {
      if (!pendingStore.has(nfa)) return harden([]);
      const list = pendingStore.get(nfa);
      const ix = list.findIndex(tx => tx.tx.amount === amount);
      if (ix >= 0) {
        const match = list[ix];
        if (list.length > 1) {
          const remaining = [...list.slice(0, ix), ...list.slice(ix + 1)];
          pendingStore.set(nfa, harden(remaining));
        } else {
          pendingStore.delete(nfa);
        }
        return harden([match]);
      }
      return harden([]);
    },
  };

  const fakeSelf = {
    disburse(txHash: EvmHash, amount: { value: bigint }, recipient: string) {
      disburseCalls.push({ txHash, amount: amount.value });
    },
  };

  // Create mintedEarly multiset with entry of 100n
  // Should match 30n + 50n (80n would exceed)
  const mintedEarly: MapStore<string, number> = zone.mapStore('mintedEarly');
  const makeMintedEarlyKey = (addr: NobleAddress, amount: bigint): string =>
    `pendingTx:${JSON.stringify([addr, String(amount)])}`;
  
  const key100 = makeMintedEarlyKey(ADDRESS, 100n);
  asMultiset(mintedEarly).add(key100);

  // Run the remediate logic
  const minUusdc = 50n;
  const parseMintedEarlyKey = (
    key: ReturnType<typeof makeMintedEarlyKey>,
  ): { address: NobleAddress; amount: bigint } => {
    const [address, amount] = JSON.parse(key.split(':')[1]);
    return harden({ address, amount: BigInt(amount) });
  };

  // Execute the remediation algorithm
  const batches = mintedEarly.entries();
  for (const [key, count] of batches) {
    const { address, amount: mintedAmount } = parseMintedEarlyKey(key);

    if (mintedAmount < minUusdc) {
      continue;
    }

    for (let i = 0; i < count; i += 1) {
      const allPending = fakeStatusManager.lookupPendingByAddress(address);
      const advancedPending = allPending.filter(
        tx => tx.status === PendingTxStatus.Advanced,
      );

      if (advancedPending.length === 0) {
        continue;
      }

      const sortedPending = advancedPending.sort(
        (a, b) => Number(a.tx.amount - b.tx.amount),
      );

      let remainingMinted = mintedAmount;
      const toDisburse = [];

      for (const pending of sortedPending) {
        if (pending.tx.amount <= remainingMinted) {
          toDisburse.push(pending);
          remainingMinted -= pending.tx.amount;
        }
      }

      if (toDisburse.length > 0) {
        for (const pending of toDisburse) {
          const dequeuedTxs = fakeStatusManager.matchAndDequeueSettlement(
            address,
            pending.tx.amount,
          );

          for (const p of dequeuedTxs) {
            const fullValue = AmountMath.make(USDC, p.tx.amount);
            fakeSelf.disburse(p.txHash, fullValue, p.aux.recipientAddress);
          }
        }
      }

      asMultiset(mintedEarly).remove(key);
    }
  }

  // Assertions
  t.is(disburseCalls.length, 2, 'should have called disburse twice');
  
  // Should match 30n and 50n (ascending sort, greedy)
  const amounts = disburseCalls.map(c => c.amount).sort((a, b) => Number(a - b));
  t.deepEqual(amounts, [30n, 50n], 'should disburse 30n and 50n');

  // Verify 80n remains in pending store
  t.true(pendingStore.has(ADDRESS), 'should still have pending txs');
  t.is(pendingStore.get(ADDRESS).length, 1, 'should have one remaining tx');
  t.is(pendingStore.get(ADDRESS)[0].tx.amount, 80n, 'remaining tx should be 80n');

  // Verify mintedEarly key was removed
  t.false(mintedEarly.has(key100), 'mintedEarly key should be removed');
});

/**
 * Test that non-Advanced txs are filtered out
 */
test('remediateMintedEarly - filters out non-Advanced txs', t => {
  const zone = makeHeapZone();
  const { brand: USDC } = makeIssuerKit('USDC');

  const pendingStore: MapStore<NobleAddress, PendingTx[]> = zone.mapStore(
    'PendingSettleTxs',
    {
      keyShape: M.string(),
      valueShape: M.arrayOf(PendingTxShape),
    },
  );

  // Create a mix of Advanced and AdvanceFailed txs
  const advancedTx = makePendingTx(100n, ADDRESS, makeHash(1));
  const failedTx = makePendingTx(50n, ADDRESS, makeHash(2));
  // @ts-expect-error - modifying status for test
  failedTx.status = PendingTxStatus.AdvanceFailed;
  
  pendingStore.init(ADDRESS, harden([advancedTx, failedTx]));

  const disburseCalls: Array<{ amount: bigint }> = [];

  const fakeStatusManager = {
    lookupPendingByAddress(nfa: NobleAddress): PendingTx[] {
      if (!pendingStore.has(nfa)) {
        return harden([]);
      }
      return harden([...pendingStore.get(nfa)]);
    },
    matchAndDequeueSettlement(
      nfa: NobleAddress,
      amount: bigint,
    ): PendingTx[] {
      if (!pendingStore.has(nfa)) return harden([]);
      const list = pendingStore.get(nfa);
      const ix = list.findIndex(tx => tx.tx.amount === amount);
      if (ix >= 0) {
        const match = list[ix];
        if (list.length > 1) {
          const remaining = [...list.slice(0, ix), ...list.slice(ix + 1)];
          pendingStore.set(nfa, harden(remaining));
        } else {
          pendingStore.delete(nfa);
        }
        return harden([match]);
      }
      return harden([]);
    },
  };

  const fakeSelf = {
    disburse(txHash: EvmHash, amount: { value: bigint }, recipient: string) {
      disburseCalls.push({ amount: amount.value });
    },
  };

  const mintedEarly: MapStore<string, number> = zone.mapStore('mintedEarly');
  const makeMintedEarlyKey = (addr: NobleAddress, amount: bigint): string =>
    `pendingTx:${JSON.stringify([addr, String(amount)])}`;
  
  const key150 = makeMintedEarlyKey(ADDRESS, 150n);
  asMultiset(mintedEarly).add(key150);

  const minUusdc = 50n;
  const parseMintedEarlyKey = (
    key: ReturnType<typeof makeMintedEarlyKey>,
  ): { address: NobleAddress; amount: bigint } => {
    const [address, amount] = JSON.parse(key.split(':')[1]);
    return harden({ address, amount: BigInt(amount) });
  };

  // Execute the remediation algorithm
  const batches = mintedEarly.entries();
  for (const [key, count] of batches) {
    const { address, amount: mintedAmount } = parseMintedEarlyKey(key);

    if (mintedAmount < minUusdc) {
      continue;
    }

    for (let i = 0; i < count; i += 1) {
      const allPending = fakeStatusManager.lookupPendingByAddress(address);
      const advancedPending = allPending.filter(
        tx => tx.status === PendingTxStatus.Advanced,
      );

      if (advancedPending.length === 0) {
        continue;
      }

      const sortedPending = advancedPending.sort(
        (a, b) => Number(a.tx.amount - b.tx.amount),
      );

      let remainingMinted = mintedAmount;
      const toDisburse = [];

      for (const pending of sortedPending) {
        if (pending.tx.amount <= remainingMinted) {
          toDisburse.push(pending);
          remainingMinted -= pending.tx.amount;
        }
      }

      if (toDisburse.length > 0) {
        for (const pending of toDisburse) {
          const dequeuedTxs = fakeStatusManager.matchAndDequeueSettlement(
            address,
            pending.tx.amount,
          );

          for (const p of dequeuedTxs) {
            const fullValue = AmountMath.make(USDC, p.tx.amount);
            fakeSelf.disburse(p.txHash, fullValue, p.aux.recipientAddress);
          }
        }
      }

      asMultiset(mintedEarly).remove(key);
    }
  }

  // Assertions
  t.is(disburseCalls.length, 1, 'should have called disburse once');
  t.is(disburseCalls[0].amount, 100n, 'should only disburse the Advanced tx');

  // Verify failedTx remains in pending store
  t.true(pendingStore.has(ADDRESS), 'should still have pending txs');
  t.is(pendingStore.get(ADDRESS).length, 1, 'should have one remaining tx');
  t.is(
    pendingStore.get(ADDRESS)[0].status,
    PendingTxStatus.AdvanceFailed,
    'remaining tx should be the failed one',
  );

  // Verify mintedEarly key was removed
  t.false(mintedEarly.has(key150), 'mintedEarly key should be removed');
});
