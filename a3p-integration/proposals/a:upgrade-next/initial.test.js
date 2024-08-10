import test from 'ava';

import { getVatDetails } from '@agoric/synthetic-chain';

const vats = {
  network: { incarnation: 0 },
  ibc: { incarnation: 0 },
  localchain: { incarnation: 0 },
  walletFactory: { incarnation: 3 },
  zoe: { incarnation: 2 },
};

test(`vat details`, async t => {
  await null;
  for (const [vatName, expected] of Object.entries(vats)) {
    const actual = await getVatDetails(vatName);
    t.like(actual, expected, `${vatName} details mismatch`);
  }
});
