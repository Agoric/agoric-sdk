import test from 'ava';

import { getVatDetails } from '@agoric/synthetic-chain';

const vats = {
  network: { incarnation: 1 },
  ibc: { incarnation: 1 },
  localchain: { incarnation: 1 },
  orchestration: { incarnation: 0 },
  transfer: { incarnation: 1 },
  walletFactory: { incarnation: 4 },
  zoe: { incarnation: 2 },
};

test(`vat details`, async t => {
  const actual = {};
  for await (const vatName of Object.keys(vats)) {
    actual[vatName] = await getVatDetails(vatName);
  }
  t.like(actual, vats, `vat details are alike`);
});
