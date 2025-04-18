// @ts-check
/* eslint-env node */
import '@endo/init/legacy.js'; // axios compat

import { LOCAL_CONFIG, makeSmartWalletKit } from '@agoric/client-utils';
import test from 'ava';
import { getIncarnation } from '@agoric/synthetic-chain';

const io = {
  delay: ms => new Promise(resolve => setTimeout(() => resolve(undefined), ms)),
  fetch: global.fetch,
};

test('accounts', async t => {
  const swk = await makeSmartWalletKit(io, LOCAL_CONFIG);

  const { poolAccount, settlementAccount } =
    await swk.readPublished('fastUsdc');

  // exact addresses are not available at design time
  t.true(poolAccount.startsWith('agoric1'));
  t.true(settlementAccount.startsWith('agoric1'));
});

test(`fastUsdc incarnation reflects cctp`, async t => {
  const history = { beta: 0, rc1: 1, gtm: 2, cctp: 3 };
  t.is(await getIncarnation('fastUsdc'), history.cctp);
});

test('feedPolicy updated for GTM', async t => {
  const swk = await makeSmartWalletKit(io, LOCAL_CONFIG);

  const policy = await swk.readPublished('fastUsdc.feedPolicy');
  t.log('policy', policy);
  t.like(policy, {
    chainPolicies: {
      Arbitrum: {
        confirmations: 96, // was 2 in Beta
      },
    },
  });
});
