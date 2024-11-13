import test from 'ava';
import { getDetailsMatchingVats } from './vatDetails.js';

test('new auction vat', async t => {
  const details = await getDetailsMatchingVats('auctioneer');
  // This query matches both the auction and its governor, so 2*3 for the
  // original, the vaults&auctions coreEval, and the priceFeed coreEval.
  t.is(Object.keys(details).length, 6);
});
