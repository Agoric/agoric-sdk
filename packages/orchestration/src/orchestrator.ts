import { cosmos } from '@agoric/cosmic-proto';
import { EncodeObject, coins } from '@cosmjs/proto-signing';
// import * as abci from 'cosmjs-types/cosmos/base/abci/v1beta1/abci.js';
import { MsgSend } from '@agoric/cosmic-proto/dist/codegen/cosmos/bank/v1beta1/tx.js';
// import { QueryAllBalancesResponse } from '@agoric/cosmic-proto/dist/codegen/cosmos/bank/v1beta1/query.js';
// import { TxBody } from '@agoric/cosmic-proto/dist/codegen/cosmos/tx/v1beta1/tx.js';
import {
  MsgDelegate,
  MsgUndelegate,
} from '@agoric/cosmic-proto/dist/codegen/cosmos/staking/v1beta1/tx.js';
import type { Chain, Transaction, TypedData } from './types.js';

export const makeOrchestrator = () => {
  const createAccount: Chain['createAccount'] = async () => {
    const info = {
      address: 'osmosis123',
      chainId: 'osmosis-1',
      localAddress: '/ibc-port/port-8/ibc-channel/channel-4',
      remoteAddress:
        '/ibc-hop/connection-992/ibc-port/icahost/ibc-channel/channel-441',
    };
    const mockSigner = {
      async signAndBroadcast(msgs: EncodeObject[]) {
        // const bytes = cosmos.tx.v1beta1.TxBody.encode({
        //   messages: msgs,
        //   memo: '',
        //   timeoutHeight: 0n, // XX todo
        // }).finish();
        // # broadcast tx to chain, wait for response
        // return cosmos.tx.v1beta1.BroadcastTxResponse.decode(bytes);
        return {
          code: 0,
          data: new Uint8Array(),
          height: 123,
          txhash: '0x123',
          rawLog: '[]',
        };
      },
    };
    return {
      info,
      agent: {
        async getInfo() {
          return info;
        },
        async msgSend(msg: Omit<MsgSend, 'fromAddress'>) {
          const response = await this.signAndBroadcast([
            {
              typeUrl: cosmos.bank.v1beta1.MsgSend.typeUrl,
              value: cosmos.bank.v1beta1.MsgSend.encode({
                ...msg,
                fromAddress: info.address,
              }).finish(),
            },
          ]);
          if (response.code !== 0) {
            throw new Error(`Failed to send: ${response.rawLog}`);
          }
          return response;
          // XXX todo: decode response
          // return cosmos.bank.v1beta1.MsgSendResponse.decode(response.data);
        },
        async msgDelegate(msg: Omit<MsgDelegate, 'delegatorAddress'>) {
          const response = await this.signAndBroadcast([
            {
              typeUrl: cosmos.staking.v1beta1.MsgDelegate.typeUrl,
              value: cosmos.staking.v1beta1.MsgDelegate.encode({
                ...msg,
                delegatorAddress: info.address,
              }).finish(),
            },
          ]);
          if (response.code !== 0) {
            throw new Error(`Failed to delegate: ${response.rawLog}`);
          }
          return response;
          // XXX todo: decode response
          // return cosmos.staking.v1beta1.MsgDelegateResponse.decode(
          //   response.data,
          // );
        },
        async msgUndelegate(msg: Omit<MsgUndelegate, 'delegatorAddress'>) {
          const response = await this.signAndBroadcast([
            {
              typeUrl: cosmos.staking.v1beta1.MsgUndelegate.typeUrl,
              value: cosmos.staking.v1beta1.MsgUndelegate.encode({
                ...msg,
                delegatorAddress: info.address,
              }).finish(),
            },
          ]);
          if (response.code !== 0) {
            throw new Error(`Failed to undelegate: ${response.rawLog}`);
          }
          return response;
          // XXX todo: decode response
          // return cosmos.staking.v1beta1.MsgUndelegateResponse.decode(
          //   response.data,
          // );
        },
        /**
         * @param {EncodeObject[]} msgs
         * @returns {Uint8Array} response bytes
         */
        async signAndBroadcast(msgs: EncodeObject[]) {
          return mockSigner.signAndBroadcast(msgs);
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

  const orc = {
    async getChain(_chainName: string) {
      return {
        async createAccount() {
          return createAccount();
        },
        async queryState(query) {
          switch (query.typeUrl) {
            case '/cosmos.bank.v1beta1.QueryAllBalancesRequest':
              return {
                balances: coins(100, 'uatom'),
              };
            default:
              throw new Error(`Unknown query type: ${query.typeUrl}`);
          }
        },
      };
    },
  };
  return orc;
};
