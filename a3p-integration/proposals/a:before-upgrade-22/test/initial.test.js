import test from 'ava';
import '@endo/init/debug.js';

import { getVatDetails } from '@agoric/synthetic-chain';

const expectedVatDetails = {
  bank: { incarnation: 2 },
  network: { incarnation: 3 },
  ibc: { incarnation: 3 },
  localchain: { incarnation: 3 },
  orchestration: { incarnation: 2 },
  provisionPool: { incarnation: 2 },
  transfer: { incarnation: 3 },
  walletFactory: { incarnation: 9 },
  zoe: { incarnation: 3 },
};

test('pre-upgrade vat details', async t => {
  const actualVatDetails = {};
  for await (const vatName of Object.keys(expectedVatDetails)) {
    actualVatDetails[vatName] = await getVatDetails(vatName);
  }
  t.like(actualVatDetails, expectedVatDetails);
});
