/* global fetch */

import test from 'ava';
import { makeVStorage } from '@agoric/client-utils';
import { networkConfig } from './test-lib/index.js';

test('readFully should vstorage node history', async t => {
  const vstorage = makeVStorage({ fetch }, networkConfig);
  const { readLatest, readAt, readFully } = vstorage;

  // this test was executed with different nodes and the same behavior was observed
  const nodePath = 'published.committees.Economic_Committee.latestQuestion';

  console.log('readLatest: ', await readLatest(nodePath));
  console.log('readLatest: ', await readAt(nodePath));

  // Return a rejected promise
  console.log('readLatest: ', await readFully(nodePath));

  t.pass();
});
