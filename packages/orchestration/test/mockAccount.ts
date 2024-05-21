import type { AnyJson } from '@agoric/cosmic-proto';
import type { Coin } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import { MsgWithdrawDelegatorRewardResponse } from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import {
  MsgDelegateResponse,
  MsgBeginRedelegateResponse,
  MsgUndelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Far } from '@endo/far';
import type { IcaAccount } from '../src/cosmos-api.js';
import { encodeTxResponse } from '../src/exos/stakingAccountKit.js';
import type { ChainAddress } from '../src/orchestration-api.js';

const { Fail } = assert;

export const configStaking = {
  acct1: {
    address: 'agoric1spy36ltduehs5dmszfrp792f0k2emcntrql3nx',
  },
  validator: {
    address: 'agoric1valoper234',
    addressEncoding: 'bech32',
    chainId: 'agoriclocal',
  },
  delegations: {
    agoric1valoper234: { denom: 'uatom', amount: '200' },
  },
  startTime: '2024-06-01T00:00Z',
  completionTime: '2024-06-22T00:00Z',
} as const;

export const configRedelegate = {
  validator: {
    address: 'agoric1valoper444',
    addressEncoding: 'bech32',
    chainId: 'atom-test',
  },
  delegations: {
    agoric1valoper234: { denom: 'uatom', amount: '50' },
  },
} as const;

export const mockAccount = (
  addr = 'agoric1234',
  delegations = {} as Record<string, Coin>,
) => {
  const calls = [] as Array<{ msgs: AnyJson[] }>;

  const simulate = {
    '/cosmos.staking.v1beta1.MsgDelegate': _m => {
      const response = MsgDelegateResponse.fromPartial({});
      return encodeTxResponse(response, MsgDelegateResponse.toProtoMsg);
    },

    '/cosmos.staking.v1beta1.MsgBeginRedelegate': _m => {
      const response = MsgBeginRedelegateResponse.fromPartial({
        completionTime: new Date('2025-12-17T03:24:00Z'),
      });
      return encodeTxResponse(response, MsgBeginRedelegateResponse.toProtoMsg);
    },

    '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': m => {
      console.log('simulate withdraw', m);
      const rewards = Object.values(delegations).map(({ denom, amount }) => ({
        denom,
        amount: `${Number(amount) / 100}`,
      }));
      const response = {
        amount: rewards,
      } as MsgWithdrawDelegatorRewardResponse;

      return encodeTxResponse(
        response,
        MsgWithdrawDelegatorRewardResponse.toProtoMsg,
      );
    },

    '/cosmos.staking.v1beta1.MsgUndelegate': _m => {
      const { completionTime } = configStaking;
      const response = MsgUndelegateResponse.fromPartial({
        completionTime: new Date(completionTime),
      });
      return encodeTxResponse(response, MsgUndelegateResponse.toProtoMsg);
    },
  };

  const chainAddress: ChainAddress = harden({
    address: addr,
    addressEncoding: 'bech32',
    chainId: 'FIXME',
  });

  const account: IcaAccount = Far('MockAccount', {
    getAddress: () => chainAddress,
    executeEncodedTx: async msgs => {
      assert.equal(msgs.length, 1);
      const { typeUrl } = msgs[0];
      const doMessage = simulate[typeUrl];
      assert(doMessage, `unknown ${typeUrl}`);
      await null;
      calls.push({ msgs });
      return doMessage(msgs[0]);
    },
    executeTx: () => Fail`mock`,
    close: () => Fail`mock`,
    deposit: () => Fail`mock`,
    getPurse: () => Fail`mock`,
    prepareTransfer: () => Fail`mock`,
    getLocalAddress: () => Fail`mock`,
    getRemoteAddress: () => Fail`mock`,
    getPort: () => Fail`mock`,
  });
  return { account, calls };
};
