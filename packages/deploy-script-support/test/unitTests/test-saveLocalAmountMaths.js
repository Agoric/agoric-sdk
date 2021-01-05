// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { makeIssuerKit } from '@agoric/ertp';

import { makeLocalAmountManager } from '../../src/saveLocalAmountMath';

test('saveLocalAmountMath, getLocalAmountMath', async t => {
  const { issuer } = makeIssuerKit('moola');
  const issuerManager = {
    get: _petname => issuer,
  };
  const { saveLocalAmountMaths, getLocalAmountMath } = makeLocalAmountManager(
    issuerManager,
  );

  await saveLocalAmountMaths(['a petname']);

  const amountMath = getLocalAmountMath('a petname');
  t.is(amountMath.getBrand(), issuer.getBrand());
});
