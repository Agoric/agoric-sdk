/** @file The mocks used in these tests */
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import {
  MsgBeginRedelegate,
  MsgBeginRedelegateResponse,
  MsgDelegate,
  MsgDelegateResponse,
  MsgUndelegate,
  MsgUndelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawDelegatorRewardResponse,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import type { Timestamp } from '@agoric/cosmic-proto/google/protobuf/timestamp.js';
import {
  MsgSend,
  MsgSendResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';
import {
  MsgLiquidStake,
  MsgLiquidStakeResponse,
  MsgRedeemStake,
  MsgRedeemStakeResponse,
} from '@agoric/cosmic-proto/stride/stakeibc/tx.js';
import {
  MsgDepositForBurn,
  MsgDepositForBurnResponse,
} from '@agoric/cosmic-proto/circle/cctp/v1/tx.js';
import {
  buildMsgResponseString,
  buildQueryResponseString,
  buildMsgErrorString,
  buildTxPacketString,
  buildQueryPacketString,
  createMockAckMap,
} from '../tools/ibc-mocks.js';
import { leftPadEthAddressTo32Bytes } from '../src/utils/address.js';

/**
 * TODO: provide mappings to cosmos error codes (and module specific error codes)
 * see https://github.com/Agoric/agoric-sdk/issues/9629 for more details about
 * error messages over ibc
 */
export const errorAcknowledgments = {
  error5: buildMsgErrorString(
    'ABCI code: 5: error handling packet: see events for details',
  ),
};

const liquidStake = {
  creator: 'cosmos1test',
  amount: '10000',
  hostDenom: 'uatom',
};
const liquidStakeRedeem = {
  creator: 'stride1test',
  amount: '10000000',
  hostZone: 'elys-1',
  receiver: 'cosmos1test',
};
const delegation = {
  amount: {
    denom: 'uatom',
    amount: '10',
  },
  delegatorAddress: 'cosmos1test',
  validatorAddress: 'cosmosvaloper1test',
};
const redelegation = {
  delegatorAddress: 'cosmos1test',
  validatorSrcAddress: 'cosmosvaloper1test',
  validatorDstAddress: 'cosmosvaloper2test',
  amount: {
    denom: 'uatom',
    amount: '10',
  },
};
const bankSend = {
  fromAddress: 'cosmos1test',
  toAddress: 'cosmos1testrecipient',
  amount: [{ denom: 'uatom', amount: '10' }],
};
const bankSendMulti = {
  fromAddress: 'cosmos1test',
  toAddress: 'cosmos1testrecipient',
  amount: [
    { denom: 'uatom', amount: '10' },
    { denom: 'ibc/1234', amount: '10' },
  ],
};

export const UNBOND_PERIOD_SECONDS = 5n;

const getUnbondingTime = (): Timestamp => ({
  seconds: UNBOND_PERIOD_SECONDS,
  nanos: 0,
});

export const protoMsgMocks = {
  liquidStake: {
    msg: buildTxPacketString([MsgLiquidStake.toProtoMsg(liquidStake)]),
    ack: buildMsgResponseString(MsgLiquidStakeResponse, {
      stToken: {
        denom: 'statom',
        amount: '1800000',
      },
    }),
  },
  liquidStakeRedeem: {
    msg: buildTxPacketString([MsgRedeemStake.toProtoMsg(liquidStakeRedeem)]),
    ack: buildMsgResponseString(MsgRedeemStakeResponse, {}),
  },
  delegate: {
    msg: buildTxPacketString([MsgDelegate.toProtoMsg(delegation)]),
    ack: buildMsgResponseString(MsgDelegateResponse, {}),
  },
  undelegate: {
    msg: buildTxPacketString([MsgUndelegate.toProtoMsg(delegation)]),
    ack: buildMsgResponseString(MsgUndelegateResponse, {
      completionTime: getUnbondingTime(),
    }),
  },
  redelegate: {
    msg: buildTxPacketString([MsgBeginRedelegate.toProtoMsg(redelegation)]),
    ack: buildMsgResponseString(MsgBeginRedelegateResponse, {
      completionTime: getUnbondingTime(),
    }),
  },
  withdrawReward: {
    msg: buildTxPacketString([
      MsgWithdrawDelegatorReward.toProtoMsg(delegation),
    ]),
    ack: buildMsgResponseString(MsgWithdrawDelegatorRewardResponse, {
      amount: [{ amount: '1', denom: 'uatom' }],
    }),
  },
  queryBalance: {
    msg: buildQueryPacketString([
      QueryBalanceRequest.toProtoMsg({
        address: 'cosmos1test',
        denom: 'uatom',
      }),
    ]),
    ack: buildQueryResponseString(QueryBalanceResponse, {
      balance: { amount: '0', denom: 'uatom' },
    }),
  },
  bankSend: {
    msg: buildTxPacketString([MsgSend.toProtoMsg(bankSend)]),
    ack: buildMsgResponseString(MsgSendResponse, {}),
  },
  bankSendMulti: {
    msg: buildTxPacketString([MsgSend.toProtoMsg(bankSendMulti)]),
    ack: buildMsgResponseString(MsgSendResponse, {}),
  },
  depositForBurn: {
    // msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ21ZS0lTOWphWEpqYkdVdVkyTjBjQzUyTVM1TmMyZEVaWEJ2YzJsMFJtOXlRblZ5YmhKQkNndGpiM050YjNNeGRHVnpkQklITkRJMU1EQXdNQmdHSWlBQUFBQUFBQUFBQUFBQUFBQWc1bzlzSjJyRzRwZXNSc2hLc21DU2duWnBIU29GZFhWelpHTT0iLCJtZW1vIjoiIn0=',
    msg: buildTxPacketString([
      MsgDepositForBurn.toProtoMsg({
        amount: '4250000',
        burnToken: 'uusdc',
        from: 'cosmos1test',
        destinationDomain: 6,
        mintRecipient: leftPadEthAddressTo32Bytes(
          '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        ),
      }),
    ]),
    ack: buildMsgResponseString(MsgDepositForBurnResponse, {}),
  },
  depositForBurnForBase: {
    msg: buildTxPacketString([
      MsgDepositForBurn.toProtoMsg({
        amount: '10',
        burnToken: 'uusdc',
        from: 'cosmos1test',
        destinationDomain: 0,
        mintRecipient: leftPadEthAddressTo32Bytes(
          '0xe0d43135EBd2593907F8f56c25ADC1Bf94FCf993',
        ),
      }),
    ]),
    // 'depositForBurn via Noble to Base' in cosmos-orchestration-account.test.ts
    ack: buildMsgResponseString(MsgDepositForBurnResponse, {}),
  },
};

export const defaultMockAckMap: Record<string, string> =
  createMockAckMap(protoMsgMocks);
