import test from 'ava';

import { USER1ADDR, waitForBlock } from '@agoric/synthetic-chain';

import { getLiveOffers } from './agd-tools.js';

// We might have to wait a full cycle for the auction to settle. That's too
// long for a test, so never mind.
test.serial.skip('trigger auction', async t => {
  await waitForBlock(2);

  const liveOffer = await getLiveOffers(USER1ADDR);
  t.log({ liveOffer });
  t.is(liveOffer.length, 0, 'There should be no liveOffers remaining');
});
