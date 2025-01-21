// @ts-check
/* eslint-env node */
import test from 'ava';
import '@endo/init/legacy.js'; // axios compat
import { LOCAL_CONFIG, makeSmartWalletKit } from '@agoric/client-utils';

const io = {
  delay: ms => new Promise(resolve => setTimeout(() => resolve(undefined), ms)),
  fetch: global.fetch,
};
test('fastUsdc is in agoricNames.instance', async t => {
  const { agoricNames } = await makeSmartWalletKit(io, LOCAL_CONFIG);

  t.log('agoricNames.instance keys', Object.keys(agoricNames.instance));
  t.truthy(agoricNames.instance.fastUsdc);
});
