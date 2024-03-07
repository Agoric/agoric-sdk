/**
 * @file sketch of e2e flows
 * https://docs.google.com/document/d/1GcyHRmg4sZ6DVTBgGkmyESdeGKDktSnahtBPQhFcB5M/edit
 */
import { test as rawTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { E } from '@endo/far';
import { coins, coin } from '@cosmjs/proto-signing';
import { makeOrchestrator } from './orchestrator.js';

// eslint-disable-next-line no-use-before-define
export type Orchestrator = ReturnType<typeof makeOrchestrator>;

const test: TestFn<{ orchestrator: Orchestrator }> = rawTest;

test.before('setup', t => {
  // eslint-disable-next-line no-use-before-define
  t.context = { orchestrator: makeOrchestrator() };
});

test('1. Create Interchain account on remote chain', async t => {
  const { orchestrator: orc } = t.context;
  const osmosisChain = await E(orc).getChain('osmosis');
  const ica1 = await E(osmosisChain).createAccount();
  t.truthy(ica1);
});

test('2. Generate Interchain Query and receive response', async t => {
  //  gaiad query interchain-accounts host packet-events [channel-id] [sequence] [flags]
  const { orchestrator: orc } = t.context;
  const osmosisChain = await E(orc).getChain('osmosis');
  const resp = await E(osmosisChain).queryState({
    typeUrl: '/cosmos.bank.v1beta1.QueryAllBalancesRequest',
    obj: { address: 'osmosis6789' },
  });
  t.like(resp, {
    typeUrl: '/cosmos.bank.v1beta1.QueryAllBalancesResponse',
    obj: {
      balances: coins(100, 'uatom'),
    },
  });
});

test('4a. Delegate tokens held by ICA on remote chain', async t => {
  // Submit a delegation message.
  const { orchestrator: orc } = t.context;
  const osmosisChain = await E(orc).getChain('osmosis');
  const ica1 = await E(osmosisChain).createAccount();

  const result = await E(ica1.agent).perform({
    messages: [
      {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        obj: {
          amount: coin(1000, 'uatom'),
          validatorAddress: 'cosmos1abc',
          delegatorAddress: ica1.info.address,
        },
      },
    ],
  });
  t.like(result, {
    results: [
      {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegateResponse',
        obj: {},
      },
    ],
  });
});

test('4a. Delegate tokens held by ICA on remote chain (alt without address)', async t => {
  // Submit a delegation message.
  const { orchestrator: orc } = t.context;
  const osmosisChain = await E(orc).getChain('osmosis');
  const ica1 = await E(osmosisChain).createAccount();

  const result = await E(ica1.agent).perform({
    messages: [
      {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        obj: {
          delegatorAddress: ica1.info.address,
          amount: coin(1000, 'uatom'),
          // ask validator 'cosmos1valoperabc'
          validatorAddress: 'cosmos1valoperabc',
        },
      },
    ],
  });
  t.like(result, {
    results: [
      {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegateResponse',
        obj: {},
      },
    ],
  });
});

test('XXX. Send tokens from ICA to another account on same Host chain', async t => {
  const { orchestrator: orc } = t.context;
  const receiver = 'cosmos345';
  const amount = coins(100, 'uatom');

  const osmosisChain = await E(orc).getChain('osmosis');
  const ica1 = await E(osmosisChain).createAccount();

  const result = await E(ica1.agent).perform({
    messages: [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        obj: {
          sender: ica1.info.address,
          receiver,
          amount,
        },
      },
    ],
  });
  // We receive the message responses in an array.
  t.like(result, {
    results: [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSendResponse',
        obj: {},
      },
    ],
  });
});
