import test from 'ava';
import { SequenceManager } from '../src/sequence-manager.ts';
import { createMockCosmosRestClient } from './mocks.ts';

test('SequenceManager initialization', async t => {
  const mockCosmosRest = createMockCosmosRestClient();
  const logs: string[] = [];

  const sequenceManager = new SequenceManager(
    {
      cosmosRest: mockCosmosRest as any,
      log: (...args: any[]) => logs.push(args.join(' ')),
    },
    {
      chainKey: 'agoric',
      address: 'agoric1test',
    },
  );

  // Should not be initialized yet
  t.throws(() => sequenceManager.getSequence(), {
    message: /not initialized/,
  });

  // Initialize
  await sequenceManager.initialize();

  // Should be initialized now
  t.is(sequenceManager.getAccountNumber(), 377);
  t.is(sequenceManager.getSequence(), 100);
  t.is(sequenceManager.getSequence(), 101); // Should increment
  t.is(sequenceManager.getAccountNumber(), 377); // Should remain constant

  t.true(
    logs.some(log => log.includes('initialized: account=377, sequence=100')),
  );
});

test('SequenceManager sync functionality', async t => {
  const mockCosmosRest = createMockCosmosRestClient();
  const logs: string[] = [];

  const sequenceManager = new SequenceManager(
    {
      cosmosRest: mockCosmosRest as any,
      log: (...args: any[]) => logs.push(args.join(' ')),
    },
    {
      chainKey: 'agoric',
      address: 'agoric1test',
    },
  );

  await sequenceManager.initialize();

  // Use some sequences
  sequenceManager.getSequence(); // 100
  sequenceManager.getSequence(); // 101

  // Mock network having advanced further
  mockCosmosRest.updateSequence('105');

  // Sync should update to network state
  await sequenceManager.syncSequence();

  t.is(sequenceManager.getSequence(), 105);
  t.true(logs.some(log => log.includes('Synced sequence: 102 → 105')));
});

test('SequenceManager error handling', async t => {
  const mockCosmosRest = {
    async getAccountSequence() {
      throw new Error('Network error');
    },
  };

  const logs: string[] = [];

  const sequenceManager = new SequenceManager(
    {
      cosmosRest: mockCosmosRest as any,
      log: (...args: any[]) => logs.push(args.join(' ')),
    },
    {
      chainKey: 'agoric',
      address: 'agoric1test',
    },
  );

  await t.throwsAsync(() => sequenceManager.initialize(), {
    message: 'Network error',
  });
  t.true(logs.some(log => log.includes('Failed to fetch account info')));
});

test('SequenceManager multiple initialization calls', async t => {
  const mockCosmosRest = createMockCosmosRestClient();

  const sequenceManager = new SequenceManager(
    {
      cosmosRest: mockCosmosRest as any,
    },
    {
      chainKey: 'agoric',
      address: 'agoric1test',
    },
  );

  // Initialize multiple times
  await sequenceManager.initialize();
  await sequenceManager.initialize();
  await sequenceManager.initialize();

  // Should only call network once
  t.is(mockCosmosRest.getCallCount(), 1);

  // Should still work correctly
  t.is(sequenceManager.getAccountNumber(), 377);
  t.is(sequenceManager.getSequence(), 100);
});
