// @ts-check
/* eslint-env node */
import test from 'ava';
import '@endo/init/legacy.js'; // axios compat
import { LOCAL_CONFIG, makeSmartWalletKit } from '@agoric/client-utils';
import { getIncarnation } from '@agoric/synthetic-chain';

const io = {
  delay: ms => new Promise(resolve => setTimeout(() => resolve(undefined), ms)),
  fetch: global.fetch,
};

test('accounts', async t => {
  const swk = await makeSmartWalletKit(io, LOCAL_CONFIG);

  // XXX readPublished once it can handle plain JSON
  const nodeStr = await swk.vstorage.readLatest('published.fastUsdc');
  const { values } = JSON.parse(JSON.parse(nodeStr).value);
  t.deepEqual(JSON.parse(values[0]), {
    // XXX A3P can't do ICA because it has no connections
    // nobleICA: 'noble1test1',
    poolAccount:
      'agoric1hp6dwm4c820nwhq4hdpxjx5h9nac2gcy7fe0slp6lwnfzm76vnwqv3gf59',
    settlementAccount:
      'agoric12rqzc0976vhxajjwqj76l7x6m0jpvpjf4mk54wyjfyemn09l6xuq7mvvpj',
  });
});

test.failing(`incarnation number`, async t => {
  t.is(await getIncarnation('fastUsdc'), 2);
});
