import test from 'ava';
import { getDetailsMatchingVats } from './vatDetails.js';

test('new auction vat', async t => {
  const details = await getDetailsMatchingVats('auctioneer');
  // This query matches both the auction and its governor
  t.true(Object.keys(details).length > 2);
});
