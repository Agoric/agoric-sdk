import test from 'ava';
import { executeCommand } from '@agoric/synthetic-chain';

test('new auction vat', async t => {
  const data = await executeCommand('pgrep', ['-cf', 'auctioneer']);
  t.is(data, '2');
});
