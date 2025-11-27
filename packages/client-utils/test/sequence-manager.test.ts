import test from 'ava';
import { makeTxSequencer } from '../src/sequence-manager.js';
import { createMockFetchAccount } from './mocks.js';

test('TxSequencer initialization', async t => {
  const mockFetch = createMockFetchAccount(377n, 100n);
  const logs: string[] = [];

  const sequencer = await makeTxSequencer(mockFetch.fetch, {
    log: (...args: any[]) => logs.push(args.join(' ')),
  });

  t.is(sequencer.getAccountNumber(), 377n);
  t.is(sequencer.nextSequence(), 100n);
  t.is(sequencer.nextSequence(), 101n);
  t.is(sequencer.getAccountNumber(), 377n);

  t.true(
    logs.some(log =>
      log.includes('Initialized accountNumber 377 sequence number to 100'),
    ),
  );
});

test('TxSequencer resync functionality', async t => {
  const mockFetch = createMockFetchAccount(377n, 100n);
  const logs: string[] = [];

  const sequencer = await makeTxSequencer(mockFetch.fetch, {
    log: (...args: any[]) => logs.push(args.join(' ')),
  });

  // Use some sequences
  sequencer.nextSequence(); // 100
  sequencer.nextSequence(); // 101

  // Mock network having advanced further
  mockFetch.setSequenceNumber(105n);

  // Resync should update to network state
  await sequencer.resync();

  t.is(sequencer.nextSequence(), 105n);
  t.true(
    logs.some(log =>
      log.includes(
        'Resynced accountNumber 377 sequence number from 102 to 105',
      ),
    ),
  );
});

test('TxSequencer error handling', async t => {
  const mockFetch = async () => {
    throw new Error('Network error');
  };

  const logs: string[] = [];

  await t.throwsAsync(
    () =>
      makeTxSequencer(mockFetch, {
        log: (...args: any[]) => logs.push(args.join(' ')),
      }),
    {
      message: 'Network error',
    },
  );
});
