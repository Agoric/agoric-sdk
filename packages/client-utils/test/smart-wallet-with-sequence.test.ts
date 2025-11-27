import test from 'ava';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { makeTxSequencer } from '../src/sequence-manager.js';
import { makeSequencingSmartWallet } from '../src/smart-wallet-with-sequence.js';
import type { SigningSmartWalletKit } from '../src/signing-smart-wallet-kit.js';
import { createMockFetchAccount, MockSigningSmartWalletKit } from './mocks.js';

test('handles concurrent offers and actions with correct sequence management', async t => {
  const mockFetch = createMockFetchAccount(377n, 100n);
  const mockWallet = new MockSigningSmartWalletKit(() =>
    mockFetch.getNetworkSequence(),
  );

  const logs: string[] = [];
  const log = (...args: any[]) => logs.push(args.join(' '));

  const sequencer = await makeTxSequencer(mockFetch.fetch, { log });

  const walletWithSequence = makeSequencingSmartWallet(
    mockWallet as any as SigningSmartWalletKit,
    sequencer,
    { log },
  );

  const promises = [
    walletWithSequence.executeOffer({ id: 'offer1' } as any),
    walletWithSequence.executeOffer({ id: 'offer2' } as any),
    walletWithSequence.sendBridgeAction({ method: 'test' } as any),
    walletWithSequence.executeOffer({ id: 'offer3' } as any),
  ];

  const results = await Promise.all(promises);

  arrayIsLike(t, results, [
    // executeOffer returns OfferStatus from pollOffer
    { status: 'accepted' },
    { status: 'accepted' },
    // sendBridgeAction returns transaction details
    {
      code: 0,
      transactionHash: 'hash_test_102',
      height: 3321453,
      sequence: 102n,
    },
    { status: 'accepted' },
  ]);

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  arrayIsLike(t, submittedTransactions, [
    { method: 'executeOffer', sequence: 100n },
    { method: 'executeOffer', sequence: 101n },
    { method: 'test', sequence: 102n },
    { method: 'executeOffer', sequence: 103n },
  ]);
  t.true(logs.some(v => v.includes('Starting queue processing')));
  t.true(logs.some(v => v.includes('executeOffer enqueued at index')));
  t.true(logs.some(v => v.includes('sendBridgeAction enqueued at index')));
});

test('handles sequence error recovery with network sync', async t => {
  const mockFetch = createMockFetchAccount(377n, 100n);
  const mockWallet = new MockSigningSmartWalletKit(
    () => mockFetch.getNetworkSequence(),
    { simulateSequenceConflicts: true },
  );

  const logs: string[] = [];
  const log = (...args: any[]) => logs.push(args.join(' '));

  const sequencer = await makeTxSequencer(mockFetch.fetch, { log });

  const walletWithSequence = makeSequencingSmartWallet(
    mockWallet as any as SigningSmartWalletKit,
    sequencer,
    { log },
  );

  mockFetch.setSequenceNumber(105n);

  const result = await walletWithSequence.executeOffer({
    id: 'offer1',
  } as any);

  t.deepEqual(result, {
    status: 'accepted',
  });

  t.true(logs.some(v => v.includes('retrying with resynced sequence number')));
  t.true(
    logs.some(v =>
      v.includes('Resynced accountNumber 377 sequence number from 101 to 105'),
    ),
  );

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  arrayIsLike(t, submittedTransactions, [
    { method: 'executeOffer', sequence: 105n },
  ]);
});
