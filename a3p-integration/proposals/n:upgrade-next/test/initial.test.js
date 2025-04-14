import test from 'ava';
import '@endo/init/debug.js';

import { getVatDetails } from '@agoric/synthetic-chain';

const vats = {
  network: { incarnation: 2 },
  ibc: { incarnation: 3 },
  localchain: { incarnation: 2 },
  orchestration: { incarnation: 1 },
  transfer: { incarnation: 2 },
  walletFactory: { incarnation: 6 },
  zoe: { incarnation: 3 },
  // Terminated in a future proposal.
  '-ATOM-USD_price_feed-governor': { incarnation: 0 },
};

test(`vat details`, async t => {
  const actual = {};
  for await (const vatName of Object.keys(vats)) {
    actual[vatName] = await getVatDetails(vatName);
  }
  t.like(actual, vats, `vat details are alike`);
});
