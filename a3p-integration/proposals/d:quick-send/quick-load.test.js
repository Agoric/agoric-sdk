// @ts-check
/* global globalThis */
import anyTest from 'ava';
import { extractStreamCellValue } from '@agoric/synthetic-chain';
import { localAPI, makeLCD } from './test-lib/cosmos-api.js';
import { makeVStorage } from './test-lib/vstorage-client.js';

/**
 * @import {TestFn} from 'ava';
 */
/** @type {TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
// @ts-expect-error XXX something weird about test.after
const test = anyTest;

const makeTestContext = async t => {
  const api = makeLCD(localAPI, { fetch: globalThis.fetch });
  return { api };
};

test.before('IO setup', async t => (t.context = await makeTestContext(t)));

test('quickSend is in agoricNames.instance', async t => {
  const { api } = t.context;
  const vs = makeVStorage(api);
  const data = await vs.readStorage('published.agoricNames.instance');
  const value = extractStreamCellValue(data);
  const capData = JSON.parse(value);
  const encoding = JSON.parse(capData?.body.replace(/^#/, ''));
  const byName = Object.fromEntries(encoding);
  t.log('agoricNames.instance keys', Object.keys(byName));
  t.truthy(byName.quickSend);
});
