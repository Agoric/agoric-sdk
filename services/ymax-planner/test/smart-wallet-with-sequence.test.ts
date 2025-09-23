import test from 'ava';
import { SequenceManager } from '../src/sequence-manager.ts';
import { SmartWalletWithSequence } from '../src/smart-wallet-with-sequence.ts';
import {
  createMockCosmosRestClient,
  MockSigningSmartWalletKit,
} from './mocks.ts';

test('handles concurrent offers and actions with correct sequence management', async t => {
  const mockCosmosRest = createMockCosmosRestClient();
  const mockWallet = new MockSigningSmartWalletKit(() =>
    mockCosmosRest.getNetworkSequence(),
  );

  const logs: string[] = [];
  const log = (...args: any[]) => logs.push(args.join(' '));

  const sequenceManager = new SequenceManager(
    { cosmosRest: mockCosmosRest as any, log },
    { chainKey: 'agoric', address: 'agoric1test' },
  );

  // Create wallet with sequence management
  const walletWithSequence = new SmartWalletWithSequence(
    {
      signingSmartWalletKit: mockWallet as any,
      sequenceManager: sequenceManager as any,
      log,
    },
    { chainId: 'agoricdev-25' },
  );

  await sequenceManager.initialize();

  // Submit multiple transactions concurrently
  const promises = [
    walletWithSequence.executeOffer({ id: 'offer1' } as any),
    walletWithSequence.executeOffer({ id: 'offer2' } as any),
    walletWithSequence.invokeEntry({ targetName: 'test1' } as any),
    walletWithSequence.sendBridgeAction({ method: 'test' } as any),
    walletWithSequence.executeOffer({ id: 'offer3' } as any),
  ];

  const results = (await Promise.all(promises)) as any;

  // All transactions should succeed
  t.is(results.length, 5);
  results.forEach(result => {
    t.is(result.code, 0);
    t.truthy(result.transactionHash);
  });

  // Transactions should have been submitted with sequential sequence numbers
  const submittedTransactions = mockWallet.getSubmittedTransactions();
  t.is(submittedTransactions.length, 5);

  const sequences = submittedTransactions.map(tx => tx.sequence);
  t.deepEqual(sequences, [100, 101, 102, 103, 104]);

  t.true(logs.some(log => log.includes('Starting queue processing')));
  t.true(logs.some(log => log.includes('Queued executeOffer')));
  t.true(logs.some(log => log.includes('Queued invokeEntry')));
  t.true(logs.some(log => log.includes('Queued sendBridgeAction')));
});

test('handles sequence error recovery with network sync', async t => {
  const mockCosmosRest = createMockCosmosRestClient();
  const mockWallet = new MockSigningSmartWalletKit(() =>
    mockCosmosRest.getNetworkSequence(),
  );

  const logs: string[] = [];
  const log = (...args: any[]) => logs.push(args.join(' '));

  // Enable sequence conflict simulation
  mockWallet.enableSequenceConflictSimulation();

  const sequenceManager = new SequenceManager(
    { cosmosRest: mockCosmosRest as any, log },
    { chainKey: 'agoric', address: 'agoric1test' },
  );

  const walletWithSequence = new SmartWalletWithSequence(
    {
      signingSmartWalletKit: mockWallet as any,
      sequenceManager: sequenceManager as any,
      log,
    },
    { chainId: 'agoricdev-25' },
  );

  await sequenceManager.initialize();

  // Simulate network advancing (as if external transactions occurred)
  mockCosmosRest.updateSequence('105'); // Network is now at 105

  // First transaction should fail due to sequence mismatch, then succeed after sync
  const result = (await walletWithSequence.executeOffer({
    id: 'offer1',
  } as any)) as any;

  t.is(result.code, 0);
  t.truthy(result.transactionHash);

  // Should have logged sequence error and recovery
  t.true(logs.some(log => log.includes('Sequence error detected')));
  t.true(logs.some(log => log.includes('Synced sequence: 101 → 105')));

  // Transaction should have been submitted with correct network sequence
  const submittedTransactions = mockWallet.getSubmittedTransactions();
  t.is(submittedTransactions.length, 1);
  t.is(submittedTransactions[0].sequence, 105);
});
