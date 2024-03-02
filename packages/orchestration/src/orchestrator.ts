import { coins } from '@cosmjs/proto-signing';
// import * as abci from 'cosmjs-types/cosmos/base/abci/v1beta1/abci.js';
import * as bankQuery from 'cosmjs-types/cosmos/bank/v1beta1/query.js';
import * as bankTx from 'cosmjs-types/cosmos/bank/v1beta1/tx.js';
import * as stakingTx from 'cosmjs-types/cosmos/staking/v1beta1/tx.js';
import type { Chain, Transaction, TypedData } from '../src/types.js';

export const makeOrchestrator = () => {
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
