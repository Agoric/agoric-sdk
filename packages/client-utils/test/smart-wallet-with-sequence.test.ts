import test from 'ava';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { makeTxSequencer } from '../src/sequence-manager.js';
import { makeSequencingSmartWallet } from '../src/smart-wallet-with-sequence.js';
import type { SigningSmartWalletKit } from '../src/signing-smart-wallet-kit.js';
import { createMockFetchAccount } from './mocks.js';

type SubmitTxResponse = {
  code: number;
  height: number;
  transactionHash: string;
  sequence: bigint;
};

class MockSigningSmartWalletKit {
  private submittedTransactions: Array<{
    method: string;
    sequence: bigint;
  }> = [];

  private networkSequence: () => bigint;

  private shouldSimulateSequenceConflicts: boolean;

  networkConfig = { chainName: 'agoricdev-25' };

  address = 'agoric1test';

  constructor(
    getNetworkSequence: () => bigint,
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

  async pollOffer(_address: string, _offerId: string) {
    void this.submittedTransactions;
    return { status: 'accepted' };
  }

  getSubmittedTransactions() {
    return this.submittedTransactions;
  }
}

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

  const results = (await Promise.all(promises)) as any;

  arrayIsLike(t, results, [
    // prettier-ignore
    { code: 0, transactionHash: 'hash_executeOffer_100', height: 3321451, sequence: 100n },
    // prettier-ignore
    { code: 0, transactionHash: 'hash_executeOffer_101', height: 3321452, sequence: 101n },
    // prettier-ignore
    { code: 0, transactionHash: 'hash_test_102', height: 3321453, sequence: 102n },
    // prettier-ignore
    { code: 0, transactionHash: 'hash_executeOffer_103', height: 3321454, sequence: 103n },
  ]);

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  arrayIsLike(t, submittedTransactions, [
    { method: 'executeOffer', sequence: 100n },
    { method: 'executeOffer', sequence: 101n },
    { method: 'test', sequence: 102n },
    { method: 'executeOffer', sequence: 103n },
  ]);
  t.true(logs.some(v => v.includes('Starting queue processing')));
  t.true(logs.some(v => v.includes('Queued executeOffer')));
  t.true(logs.some(v => v.includes('Queued sendBridgeAction')));
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

  const result = (await walletWithSequence.executeOffer({
    id: 'offer1',
  } as any)) as any;

  t.deepEqual(result, {
    code: 0,
    height: 3321451,
    transactionHash: `hash_executeOffer_105`,
    sequence: 105n,
  });

  t.true(logs.some(v => v.includes('Sequence error detected')));
  t.true(logs.some(v => v.includes('Resynced accountNumber 377 sequence number from 101 to 105')));

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  arrayIsLike(t, submittedTransactions, [
    { method: 'executeOffer', sequence: 105n },
  ]);
});
