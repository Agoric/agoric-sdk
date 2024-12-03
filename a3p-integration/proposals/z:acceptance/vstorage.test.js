/* global fetch */

import test from 'ava';
import { makeVStorage } from '@agoric/client-utils';
import { networkConfig } from './test-lib/index.js';
import { makeVStorage as mockVstorage } from './test-lib/batchQuery.js';
import { makeAPI } from './test-lib/makeHttpClient.js';

test.skip('readFully should vstorage node history', async t => {
  const vstorage = makeVStorage({ fetch }, networkConfig);
  const { readLatest, readAt, readFully } = vstorage;

  // this test was executed with different nodes and the same behavior was observed
  const nodePath = 'published.committees.Economic_Committee.latestQuestion';

  console.log('readLatest: ', await readLatest(nodePath));
  console.log('readAt: ', await readAt(nodePath));

  // Return a rejected promise
  console.log('readFully: ', await readFully(nodePath));

  t.pass();
});

test('readHistory should return vstorage node history', async t => {
    const nodePath = 'published.committees.Economic_Committee.latestQuestion';
    const apiAddress = 'http://0.0.0.0:1317';
  
    const lcd = makeAPI(apiAddress, { fetch });
    const { readHistory } = mockVstorage(lcd);
  
    const historyIterator = await readHistory(nodePath);
    const history = [];
  
    for await (const data of historyIterator) {
      if (data) {
        history.push(data);
      }
    }
    console.log('history: ', history);
  
    t.true(history.length > 0);
  });

