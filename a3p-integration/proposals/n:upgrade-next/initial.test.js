/** @file Tests that precede the software upgrade proposal */
import test from 'ava';
import '@endo/init/debug.js';

import { getVatDetails } from '@agoric/synthetic-chain';
import { deeplyFulfilledObject, objectMap } from '@agoric/internal';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import { getGovernedVatDetails } from './test-lib/vats.js';

const expectedVatDetails = {
  bank: { incarnation: 1 },
  network: { incarnation: 2 },
  ibc: { incarnation: 2 },
  localchain: { incarnation: 2 },
  orchestration: { incarnation: 1 },
  transfer: { incarnation: 2 },
  walletFactory: { incarnation: 6 },
  zoe: { incarnation: 3 },
};

test('pre-upgrade vat details', async t => {
  const actualVatDetails = await deeplyFulfilledObject(
    objectMap(expectedVatDetails, (_, vatName) => getVatDetails(vatName)),
  );
  t.like(actualVatDetails, expectedVatDetails);

  arrayIsLike(t, await getGovernedVatDetails('-stATOM-USD_price_feed'), [
    { nameSuffix: '', incarnation: 0 },
  ]);
  arrayIsLike(t, await getGovernedVatDetails('-ATOM-USD_price_feed'), [
    { nameSuffix: '-governor', incarnation: 0 },
    { nameSuffix: '', incarnation: 0 },
  ]);
});
