import test from 'ava';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { makeSequenceManager } from '../src/sequence-manager.js';
import { makeSmartWalletWithSequence } from '../src/smart-wallet-with-sequence.js';
import type { SigningSmartWalletKit } from '../src/signing-smart-wallet-kit.js';
import { createMockFetchAccountInfo } from './mocks.js';

type SubmitTxResponse = {
  code: number;
  height: number;
  transactionHash: string;
  sequence: number;
};

class MockSigningSmartWalletKit {
  private submittedTransactions: Array<{
    method: string;
    sequence: number;
  }> = [];

  private networkSequence: () => number;

  private shouldSimulateSequenceConflicts: boolean;

  constructor(
    getNetworkSequence: () => number,
    options: { simulateSequenceConflicts?: boolean } = {},
  ) {
    this.networkSequence = getNetworkSequence;
    this.shouldSimulateSequenceConflicts =
      options.simulateSequenceConflicts ?? false;
  }

  async sendBridgeAction(
    action: any,
    fee: any,
    memo: any,
    signerData: any,
  ): Promise<SubmitTxResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    const currentNetworkSequence = this.networkSequence();

    // Simulate sequence mismatch if enabled and sequence is out of sync
    if (
      this.shouldSimulateSequenceConflicts &&
      signerData.sequence < currentNetworkSequence
    ) {
      throw new Error(
        `Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected ${currentNetworkSequence}, got ${signerData.sequence}: incorrect account sequence`,
      );
    }

    // Record successful transaction
    const method = action.method || 'sendBridgeAction';
    this.submittedTransactions.push({
      method,
      sequence: signerData.sequence,
    });

    return {
      code: 0,
      height: 3321450 + this.submittedTransactions.length,
      transactionHash: `hash_${method}_${signerData.sequence}`,
      sequence: signerData.sequence,
    };
  }

  getSubmittedTransactions() {
    return this.submittedTransactions;
  }
}

test('handles concurrent offers and actions with correct sequence management', async t => {
  const mockFetch = createMockFetchAccountInfo('377', '100');
  const mockWallet = new MockSigningSmartWalletKit(() =>
    mockFetch.getNetworkSequence(),
  );

  const logs: string[] = [];
  const log = (...args: any[]) => logs.push(args.join(' '));

  const sequenceManager = await makeSequenceManager(
    { log },
    { address: 'agoric1test', fetchAccountInfo: mockFetch.fetch },
  );

  const walletWithSequence = makeSmartWalletWithSequence(
    {
      signingSmartWalletKit: mockWallet as any as SigningSmartWalletKit,
      sequenceManager: sequenceManager as any,
      log,
    },
    { chainId: 'agoricdev-25' },
  );

  const promises = [
    walletWithSequence.executeOffer({ id: 'offer1' } as any),
    walletWithSequence.executeOffer({ id: 'offer2' } as any),
    walletWithSequence.sendBridgeAction({ method: 'test' } as any),
    walletWithSequence.executeOffer({ id: 'offer3' } as any),
  ];

  const results = (await Promise.all(promises)) as any;

  arrayIsLike(t, results, [
    // prettier-ignore
    { code: 0, transactionHash: 'hash_executeOffer_100', height: 3321451, sequence: 100 },
    // prettier-ignore
    { code: 0, transactionHash: 'hash_executeOffer_101', height: 3321452, sequence: 101 },
    // prettier-ignore
    { code: 0, transactionHash: 'hash_test_102', height: 3321453, sequence: 102 },
    // prettier-ignore
    { code: 0, transactionHash: 'hash_executeOffer_103', height: 3321454, sequence: 103 },
  ]);

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  arrayIsLike(t, submittedTransactions, [
    { method: 'executeOffer', sequence: 100 },
    { method: 'executeOffer', sequence: 101 },
    { method: 'test', sequence: 102 },
    { method: 'executeOffer', sequence: 103 },
  ]);
  t.true(logs.some(v => v.includes('Starting queue processing')));
  t.true(logs.some(v => v.includes('Queued executeOffer')));
  t.true(logs.some(v => v.includes('Queued sendBridgeAction')));
});

test('handles sequence error recovery with network sync', async t => {
  const mockFetch = createMockFetchAccountInfo('377', '100');
  const mockWallet = new MockSigningSmartWalletKit(
    () => mockFetch.getNetworkSequence(),
    { simulateSequenceConflicts: true },
  );

  const logs: string[] = [];
  const log = (...args: any[]) => logs.push(args.join(' '));

  const sequenceManager = await makeSequenceManager(
    { log },
    { address: 'agoric1test', fetchAccountInfo: mockFetch.fetch },
  );

  const walletWithSequence = makeSmartWalletWithSequence(
    {
      signingSmartWalletKit: mockWallet as any as SigningSmartWalletKit,
      sequenceManager: sequenceManager as any,
      log,
    },
    { chainId: 'agoricdev-25' },
  );

  mockFetch.setSequenceNumber('105');

  const result = (await walletWithSequence.executeOffer({
    id: 'offer1',
  } as any)) as any;

  t.deepEqual(result, {
    code: 0,
    height: 3321451,
    transactionHash: `hash_executeOffer_105`,
    sequence: 105,
  });

  t.true(logs.some(v => v.includes('Sequence error detected')));
  t.true(logs.some(v => v.includes('Synced sequence: 101 → 105')));

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  arrayIsLike(t, submittedTransactions, [
    { method: 'executeOffer', sequence: 105 },
  ]);
});
