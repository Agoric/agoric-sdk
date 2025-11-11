import test from 'ava';
import {
  makeSequenceManager,
  type AccountResponse,
} from '../src/sequence-manager.js';
import { makeSmartWalletWithSequence } from '../src/smart-wallet-with-sequence.js';
import type { SigningSmartWalletKit } from '../src/signing-smart-wallet-kit.js';

const createMockFetchAccountInfo = () => {
  let mockSequence = '100';
  const mockAccountNumber = '377';

  const fetch = async (address: string): Promise<AccountResponse> => {
    return {
      account: {
        '@type': '/cosmos.auth.v1beta1.BaseAccount',
        address,
        account_number: mockAccountNumber,
        sequence: mockSequence,
      },
    };
  };

  return {
    fetch,
    updateSequence: (newSequence: string) => {
      mockSequence = newSequence;
    },
    getNetworkSequence: () => Number(mockSequence),
  };
};

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

  private shouldSimulateSequenceConflicts = false;

  constructor(getNetworkSequence: () => number) {
    this.networkSequence = getNetworkSequence;
  }

  enableSequenceConflictSimulation() {
    this.shouldSimulateSequenceConflicts = true;
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
  const mockFetch = createMockFetchAccountInfo();
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

  t.is(results.length, 4);
  results.forEach((result: any) => {
    t.is(result.code, 0);
    t.truthy(result.transactionHash);
  });

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  t.is(submittedTransactions.length, 4);

  const sequences = submittedTransactions.map(tx => tx.sequence);
  t.deepEqual(sequences, [100, 101, 102, 103]);

  t.true(logs.some(v => v.includes('Starting queue processing')));
  t.true(logs.some(v => v.includes('Queued executeOffer')));
  t.true(logs.some(v => v.includes('Queued sendBridgeAction')));
});

test('handles sequence error recovery with network sync', async t => {
  const mockFetch = createMockFetchAccountInfo();
  const mockWallet = new MockSigningSmartWalletKit(() =>
    mockFetch.getNetworkSequence(),
  );

  const logs: string[] = [];
  const log = (...args: any[]) => logs.push(args.join(' '));

  mockWallet.enableSequenceConflictSimulation();

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

  mockFetch.updateSequence('105');

  const result = (await walletWithSequence.executeOffer({
    id: 'offer1',
  } as any)) as any;

  t.is(result.code, 0);
  t.truthy(result.transactionHash);

  t.true(logs.some(v => v.includes('Sequence error detected')));
  t.true(logs.some(v => v.includes('Synced sequence: 101 → 105')));

  const submittedTransactions = mockWallet.getSubmittedTransactions();
  t.is(submittedTransactions.length, 1);
  t.is(submittedTransactions[0].sequence, 105);
});
