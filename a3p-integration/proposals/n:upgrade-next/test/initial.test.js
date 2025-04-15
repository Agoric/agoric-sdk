import test from 'ava';
import '@endo/init/debug.js';

import { getVatDetails } from '@agoric/synthetic-chain';

const vats = {
  network: { incarnation: 3 },
  ibc: { incarnation: 3 },
  localchain: { incarnation: 3 },
  orchestration: { incarnation: 2 },
  transfer: { incarnation: 3 },
  walletFactory: { incarnation: 7 },
  zoe: { incarnation: 3 },
};

test(`vat details`, async t => {
  const actual = {};
  for await (const vatName of Object.keys(vats)) {
    actual[vatName] = await getVatDetails(vatName);
  }
  t.like(actual, vats, `vat details are alike`);
});
