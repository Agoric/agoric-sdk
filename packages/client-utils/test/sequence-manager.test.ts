import test from 'ava';
import {
  makeSequenceManager,
  type AccountResponse,
} from '../src/sequence-manager.js';

const createMockFetchAccountInfo = () => {
  let mockSequence = '100';
  const mockAccountNumber = '377';
  let callCount = 0;

  const fetch = async (address: string): Promise<AccountResponse> => {
    callCount += 1;
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
    getCallCount: () => callCount,
  };
};

test('SequenceManager initialization', async t => {
  const mockFetch = createMockFetchAccountInfo();
  const logs: string[] = [];

  const sequenceManager = await makeSequenceManager(
    {
      log: (...args: any[]) => logs.push(args.join(' ')),
    },
    {
      address: 'agoric1test',
      fetchAccountInfo: mockFetch.fetch,
    },
  );

  t.is(sequenceManager.getAccountNumber(), 377);
  t.is(sequenceManager.getSequence(), 100);
  t.is(sequenceManager.getSequence(), 101);
  t.is(sequenceManager.getAccountNumber(), 377);

  t.true(
    logs.some(log => log.includes('initialized: account=377, sequence=100')),
  );
});

test('SequenceManager sync functionality', async t => {
  const mockFetch = createMockFetchAccountInfo();
  const logs: string[] = [];

  const sequenceManager = await makeSequenceManager(
    {
      log: (...args: any[]) => logs.push(args.join(' ')),
    },
    {
      address: 'agoric1test',
      fetchAccountInfo: mockFetch.fetch,
    },
  );

  // Use some sequences
  sequenceManager.getSequence(); // 100
  sequenceManager.getSequence(); // 101

  // Mock network having advanced further
  mockFetch.updateSequence('105');

  // Sync should update to network state
  await sequenceManager.syncSequence();

  t.is(sequenceManager.getSequence(), 105);
  t.true(logs.some(log => log.includes('Synced sequence: 102 → 105')));
});

test('SequenceManager error handling', async t => {
  const mockFetch = async () => {
    throw new Error('Network error');
  };

  const logs: string[] = [];

  await t.throwsAsync(
    () =>
      makeSequenceManager(
        {
          log: (...args: any[]) => logs.push(args.join(' ')),
        },
        {
          address: 'agoric1test',
          fetchAccountInfo: mockFetch,
        },
      ),
    {
      message: 'Network error',
    },
  );
  t.true(logs.some(log => log.includes('Failed to fetch account info')));
});
