import test from 'ava';

import { evalBundles, waitForBlock } from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'newAuction-submission';

test('update all priceFeed vats', async t => {
  await null;

  await evalBundles(SUBMISSION_DIR);

  await waitForBlock(2); // enough time for 4 vats to start

  t.pass('new Auction');
});
