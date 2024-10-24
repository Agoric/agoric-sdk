// @ts-check
/* global globalThis */
import test from 'ava';
import { extractStreamCellValue } from '@agoric/synthetic-chain';
import { localAPI, makeLCD } from './test-lib/cosmos-api.js';
import { makeVStorage } from './test-lib/vstorage-client.js';

const io = { api: makeLCD(localAPI, { fetch: globalThis.fetch }) };

test('quickSend is in agoricNames.instance', async t => {
  const vs = makeVStorage(io.api);
  const data = await vs.readStorage('published.agoricNames.instance');
  const value = extractStreamCellValue(data);
  assert.typeof(value, 'string');
  const capData = JSON.parse(value);
  const encoding = JSON.parse(capData?.body.replace(/^#/, ''));
  const byName = Object.fromEntries(encoding);
  t.log('agoricNames.instance keys', Object.keys(byName));
  t.truthy(byName.quickSend);
});
