import test from 'ava';

// XXX the @cosmjs packages load `axios` and `protobufjs`  versions that are incompatible with Endo (which Ava has already inited)
// UNTIL https://github.com/cosmology-tech/telescope/issues/692
import { QueryClient, setupStakingExtension } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';

import { GOV1ADDR } from '@agoric/synthetic-chain';
import assert from 'node:assert';
import process from 'node:process';
import { networkConfig, agdWalletUtils } from './test-lib/index.js';

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

  const { brand } = agdWalletUtils.agoricNames;

  t.is((await currentDelegation()).length, 1, 'just the initial delegation');

  /** @type {import('@agoric/ertp').Brand} */
  // @ts-expect-error actually a BoardRemote
  const BLDBrand = brand.BLD;

  await agdWalletUtils.broadcastBridgeAction(GOV1ADDR, {
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
          In: { brand: BLDBrand, value: 10n },
        },
      },
    },
  });

  await agdWalletUtils.broadcastBridgeAction(GOV1ADDR, {
    method: 'executeOffer',
    offer: {
      id: 'request-delegate-6',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-stake',
        invitationMakerName: 'Delegate',
        invitationArgs: [VALIDATOR_ADDRESS, { brand: BLDBrand, value: 10n }],
      },
      proposal: {
        give: {
          In: { brand: BLDBrand, value: 10n },
        },
      },
    },
  });

  const afterDelegate = await currentDelegation();
  t.is(afterDelegate.length, 2, 'delegations after delegation');
  t.like(afterDelegate[1], {
    balance: { amount: '10', denom: 'ubld' },
    // omit 'delegation' because it has 'delegatorAddress' which is different every test run
  });

  await agdWalletUtils.broadcastBridgeAction(GOV1ADDR, {
    method: 'executeOffer',
    offer: {
      id: 'request-undelegate',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-stake',
        invitationMakerName: 'Undelegate',
        invitationArgs: [VALIDATOR_ADDRESS, { brand: brand.BLD, value: 5n }],
      },
      proposal: {},
    },
  });

  // TODO wait until completionTime, so we can check the count has gone back down
  // https://github.com/Agoric/agoric-sdk/pull/9439#discussion_r1626451871

  // const afterUndelegate = await currentDelegation();
  // t.is(afterDelegate.length, 1, 'delegations after undelegation');
  // t.like(afterUndelegate[1], {
  //   balance: { amount: '5', denom: 'ubld' },
  // });
});
