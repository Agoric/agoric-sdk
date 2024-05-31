/* eslint-disable @jessie.js/safe-await-separator -- buggy version */
import test from 'ava';

import { QueryClient, setupStakingExtension } from '@cosmjs/stargate'; // fails to import after Endo/init

import '@endo/init';

import { GOV1ADDR } from '@agoric/synthetic-chain';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import assert from 'node:assert';
import process from 'node:process';
import { networkConfig, walletUtils } from './test-lib/index.js';

// XXX not the same as VALIDATOR_ADDRESS, which is actually the delegator
const VALIDATOR_ADDRESS = process.env.VALIDATOR_ADDRESS;
assert(VALIDATOR_ADDRESS, 'Missing VALIDATOR_ADDRESS in env');

const currentDelegation = async () => {
  const endpoint = networkConfig.rpcAddrs[0];
  const tmClient = await Tendermint34Client.connect(endpoint);
  const query = QueryClient.withExtensions(tmClient, setupStakingExtension);
  const res = await query.staking.validatorDelegations(VALIDATOR_ADDRESS);

  return res.delegationResponses;
};

test('basic', async t => {
  assert(GOV1ADDR);

  const { brand } = walletUtils.agoricNames;

  t.is((await currentDelegation()).length, 1, 'just the initial delegation');

  await walletUtils.broadcastBridgeAction(GOV1ADDR, {
    method: 'executeOffer',
    offer: {
      id: 'request-stake',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['stakeBld'],
        callPipe: [['makeStakeBldInvitation']],
      },
      proposal: {
        give: {
          In: { brand: brand.BLD, value: 10n },
        },
      },
    },
  });

  await walletUtils.broadcastBridgeAction(GOV1ADDR, {
    method: 'executeOffer',
    offer: {
      id: 'request-delegate-6',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-stake',
        invitationMakerName: 'Delegate',
        invitationArgs: [VALIDATOR_ADDRESS, { brand: brand.BLD, value: 10n }],
      },
      proposal: {
        give: {
          In: { brand: brand.BLD, value: 10n },
        },
      },
    },
  });

  const postDelegation = await currentDelegation();
  t.is(postDelegation.length, 2, 'new delegation now');
  t.like(postDelegation[1], {
    balance: { amount: '10', denom: 'ubld' },
    // omit 'delegation' because it has 'delegatorAddress' which is different every test run
  });
});
