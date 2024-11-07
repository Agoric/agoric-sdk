import test from 'ava';

import { getVatDetails } from '@agoric/synthetic-chain';

const vats = {
  network: { incarnation: 2 },
  ibc: { incarnation: 2 },
  localchain: { incarnation: 1 },
  orchestration: { incarnation: 1 },
  transfer: { incarnation: 1 },
  walletFactory: { incarnation: 5 },
  zoe: { incarnation: 3 },
};

test(`vat details`, async t => {
  const actual = {};
  for await (const vatName of Object.keys(vats)) {
    actual[vatName] = await getVatDetails(vatName);
  }
  t.like(actual, vats, `vat details are alike`);
});
