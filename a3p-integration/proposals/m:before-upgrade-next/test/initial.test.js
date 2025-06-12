import test from 'ava';
import '@endo/init/debug.js';

import { getVatDetails } from '@agoric/synthetic-chain';
import { arrayIsLike } from '../test-lib/ava-assertions.js';
import { getGovernedVatDetails } from '../test-lib/vats.js';

const expectedVatDetails = {
  bank: { incarnation: 2 },
  network: { incarnation: 3 },
  ibc: { incarnation: 3 },
  localchain: { incarnation: 3 },
  orchestration: { incarnation: 2 },
  transfer: { incarnation: 3 },
  walletFactory: { incarnation: 7 },
  zoe: { incarnation: 3 },
};

test('pre-upgrade vat details', async t => {
  const actualVatDetails = {};
  for await (const vatName of Object.keys(expectedVatDetails)) {
    actualVatDetails[vatName] = await getVatDetails(vatName);
  }
  t.like(actualVatDetails, expectedVatDetails);

  arrayIsLike(t, await getGovernedVatDetails('-stATOM-USD_price_feed'), [
    // old generation (price feed only)
    { nameSuffix: '', incarnation: 0 },
    // current generation
    { nameSuffix: '-governor', incarnation: 0 },
    { nameSuffix: '', incarnation: 0 },
  ]);
  arrayIsLike(t, await getGovernedVatDetails('-ATOM-USD_price_feed'), [
    // old generation
    { nameSuffix: '-governor', incarnation: 0 },
    { nameSuffix: '', incarnation: 0 },
    // current generation
    { nameSuffix: '-governor', incarnation: 0 },
    { nameSuffix: '', incarnation: 0 },
  ]);
});
