// @ts-check
import test from 'ava';
import '@endo/init/debug.js';

import {
  getDetailsMatchingVats,
  getIncarnation,
} from '@agoric/synthetic-chain';

/**
 * @file
 * A test of upgrading vat-priceAuthority, which is planned to ship in Upgrade 9
 */

test('priceAuthorityRegistry upgrade', async t => {
  t.is(await getIncarnation('priceAuthority'), 1);

  const priceAuthorityVats = await getDetailsMatchingVats('priceAuthority');
  t.is(priceAuthorityVats.length, 1);
});
