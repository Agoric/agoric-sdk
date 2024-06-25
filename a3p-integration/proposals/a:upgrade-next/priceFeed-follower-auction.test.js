import test from 'ava';
import { getDetailsMatchingVats } from './vatDetails.js';

test('new auction vat', async t => {
  const details = await getDetailsMatchingVats('auctioneer');
  // This query matches both the auction and its governor, so 2*2
  t.is(Object.keys(details).length, 4);
});
