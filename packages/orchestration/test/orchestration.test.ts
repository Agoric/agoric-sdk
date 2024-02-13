/**
 * @file sketch of e2e flows
 * https://docs.google.com/document/d/1GcyHRmg4sZ6DVTBgGkmyESdeGKDktSnahtBPQhFcB5M/edit
 */
import { test as rawTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { E } from '@endo/far';
import { coins, coin } from '@cosmjs/proto-signing';
import * as abci from 'cosmjs-types/cosmos/base/abci/v1beta1/abci.js';
import * as bankQuery from 'cosmjs-types/cosmos/bank/v1beta1/query.js';
import * as bankTx from 'cosmjs-types/cosmos/bank/v1beta1/tx.js';
import * as stakingTx from 'cosmjs-types/cosmos/staking/v1beta1/tx.js';
import type { Chain, Transaction, TypedData } from '../src/types.js';

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
        typeUrl: `/${stakingTx.protobufPackage}.MsgDelegate`,
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

const makeOrchestrator = () => {
  const makeCodecRegistry = () => {
    const codecRegistry = new Map<string, any>();
    const codecs = {
      registerModule(module) {
        const pkg = module.protobufPackage;
        for (const [name, type] of Object.entries(module)) {
          const typeUrl = `/${pkg}.${name}`;
          codecRegistry.set(typeUrl, type);
        }
      },
      encode(typeUrl: string, partial: Record<string, any>) {
        // this could be optimized by passing the immutable address along with the object
        const cdc = codecRegistry.get(typeUrl);
        if (!cdc) {
          throw new Error(`Unregistered typeUrl: ${typeUrl}`);
        }
        const obj = cdc.fromPartial(partial);
        const encodedMsg = cdc.encode(obj).finish();
        return {
          typeUrl,
          obj,
          value: encodedMsg,
        };
      },
      decode(data: TypedData) {
        const { typeUrl, value } = data;
        const cdc = codecRegistry.get(typeUrl);
        if (!cdc) {
          throw new Error(`Unregistered typeUrl: ${typeUrl}`);
        }
        const obj = cdc.decode(value);
        return {
          ...data,
          obj,
        };
      },
    };
    return codecs;
  };

  const createAccount: Chain['createAccount'] = async codecs => {
    const info = {
      address: 'osmosis123',
      chainId: 'osmosis-1',
      localAddress: '/ibc-port/port-8/ibc-channel/channel-4',
      remoteAddress:
        '/ibc-hop/connection-992/ibc-port/icahost/ibc-channel/channel-441',
    };
    assert(codecs);
    return {
      info,
      agent: {
        async getInfo() {
          return info;
        },
        async perform(tx: Transaction) {
          const encodedResults = tx.messages.map(msg => {
            switch (msg.typeUrl) {
              case '/cosmos.bank.v1beta1.MsgSend': {
                return codecs.encode(
                  '/cosmos.bank.v1beta1.MsgSendResponse',
                  {},
                );
              }
              case '/cosmos.staking.v1beta1.MsgDelegate': {
                return codecs.encode(
                  '/cosmos.staking.v1beta1.MsgDelegateResponse',
                  {},
                );
              }
              default: {
                throw new Error(
                  `Unknown message type to perform: ${msg.typeUrl}`,
                );
              }
            }
          });
          const results = encodedResults.map(msg => codecs.decode(msg));
          return {
            results,
          };
        },
      },
      authorizer: {
        async getInfo() {
          return info;
        },
        async authorize(tx: Transaction) {
          return {};
        },
      },
    };
  };

  const defaultCodecs = makeCodecRegistry();
  defaultCodecs.registerModule(bankQuery);
  defaultCodecs.registerModule(bankTx);
  defaultCodecs.registerModule(stakingTx);

  const orc = {
    async getChain(_chainName: string, codecs = defaultCodecs) {
      return {
        async createAccount(cdc = codecs) {
          return createAccount(cdc);
        },
        async queryState(query) {
          switch (query.typeUrl) {
            case '/cosmos.bank.v1beta1.QueryAllBalancesRequest':
              return codecs.encode(
                '/cosmos.bank.v1beta1.QueryAllBalancesResponse',
                {
                  balances: coins(100, 'uatom'),
                },
              );
            default:
              throw new Error(`Unknown query type: ${query.typeUrl}`);
          }
        },
      };
    },
  };
  return orc;
};
