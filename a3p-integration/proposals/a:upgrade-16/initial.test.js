import test from 'ava';

import { getVatDetails } from '@agoric/synthetic-chain';

const vats = {
  walletFactory: { incarnation: 3 },
  zoe: { incarnation: 1 },
};

test(`vat details`, async t => {
  await null;
  for (const [vatName, expected] of Object.entries(vats)) {
    const actual = await getVatDetails(vatName);
    t.like(actual, expected, `${vatName} details mismatch`);
  }
});
