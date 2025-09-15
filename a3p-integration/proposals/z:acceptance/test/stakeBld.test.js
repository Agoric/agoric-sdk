import test from 'ava';

import { QueryClient, setupStakingExtension } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';

import { GOV1ADDR } from '@agoric/synthetic-chain';
import assert from 'node:assert';
import process from 'node:process';
import { networkConfig, agdWalletUtils } from './test-lib/index.js';

const BLD_COIN_DENOM = 'ubld';
const BLD_DELEGATION = 10n;
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
          In: { brand: BLDBrand, value: BLD_DELEGATION },
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
        invitationArgs: [
          VALIDATOR_ADDRESS,
          { brand: BLDBrand, value: BLD_DELEGATION },
        ],
      },
      proposal: {
        give: {
          In: { brand: BLDBrand, value: BLD_DELEGATION },
        },
      },
    },
  });

  const afterDelegate = await currentDelegation();
  t.is(afterDelegate.length, 2, 'delegations after delegation');
  t.truthy(
    afterDelegate.some(
      ({ balance }) =>
        balance.denom === BLD_COIN_DENOM &&
        balance.amount === String(BLD_DELEGATION),
    ),
    `${JSON.stringify(afterDelegate)} doesn't have the required delegation`,
  );

  await agdWalletUtils.broadcastBridgeAction(GOV1ADDR, {
    method: 'executeOffer',
    offer: {
      id: 'request-undelegate',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-stake',
        invitationMakerName: 'Undelegate',
        invitationArgs: [
          VALIDATOR_ADDRESS,
          { brand: brand.BLD, value: BLD_DELEGATION / 2n },
        ],
      },
      proposal: {},
    },
  });

  // TODO wait until completionTime, so we can check the count has gone back down
  // https://github.com/Agoric/agoric-sdk/pull/9439#discussion_r1626451871

  // const afterUndelegate = await currentDelegation();
  // t.is(afterDelegate.length, 1, 'delegations after undelegation');
  // t.like(afterUndelegate[1], {
  //   balance: { amount: String(BLD_DELEGATION / 2n), denom: BLD_COIN_DENOM },
  // });
});
