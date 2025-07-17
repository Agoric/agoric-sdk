// @ts-check
/* global globalThis */
import test from 'ava';
import '@endo/init/legacy.js'; // axios compat
import { makeVstorageKit } from '@agoric/client-utils';

const io = { fetch: globalThis.fetch };
const networkConfig = {
  rpcAddrs: ['http://0.0.0.0:26657'],
  chainName: 'agoriclocal',
};

test('fastUsdc is in agoricNames.instance', async t => {
  const { agoricNames } = await makeVstorageKit(io, networkConfig);

  t.log('agoricNames.instance keys', Object.keys(agoricNames.instance));
  t.truthy(agoricNames.instance.ymax0);
});
