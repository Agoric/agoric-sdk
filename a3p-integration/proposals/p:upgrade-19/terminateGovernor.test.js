/* eslint-env node */

import test from 'ava';
import '@endo/init/debug.js';

import { retryUntilCondition } from '@agoric/client-utils';
import { evalBundles } from '@agoric/synthetic-chain';
import { getDetailsMatchingVats } from './vatDetails.js';

test('verify governor termination', async t => {
  const getVats = () =>
    getDetailsMatchingVats('-ATOM-USD_price_feed-governor', true);
  const vatIsAlive = vat => !vat.terminated;

  const initialVats = await getVats();
  t.log('initial instances', initialVats);

  const initialLiveVats = initialVats.filter(vatIsAlive);
  t.true(initialLiveVats.length > 0);

  await evalBundles('terminate-governor');
  const checkForTermination = vats => {
    t.log(vats);
    return vats.filter(vatIsAlive).length < initialLiveVats.length;
  };
  await retryUntilCondition(
    getVats,
    checkForTermination,
    'ATOM-USD price feed governor termination',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );
  t.pass();
});
