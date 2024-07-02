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
import {
  buildMsgResponseString,
  buildQueryResponseString,
  buildMsgErrorString,
  buildTxPacketString,
  buildQueryPacketString,
} from '../tools/ibc-mocks.js';
import { MILLISECONDS_PER_SECOND } from '../src/utils/time.js';

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

export const UNBOND_PERIOD_SECONDS = 5n;

const getCompletionTime = () => {
  // 5 seconds fron unix epoch
  return new Date(0 + Number(UNBOND_PERIOD_SECONDS * MILLISECONDS_PER_SECOND));
};

export const protoMsgMocks = {
  delegate: {
    msg: buildTxPacketString([MsgDelegate.toProtoMsg(delegation)]),
    ack: buildMsgResponseString(MsgDelegateResponse, {}),
  },
  undelegate: {
    msg: buildTxPacketString([MsgUndelegate.toProtoMsg(delegation)]),
    ack: buildMsgResponseString(MsgUndelegateResponse, {
      completionTime: getCompletionTime(),
    }),
  },
  redelegate: {
    msg: buildTxPacketString([MsgBeginRedelegate.toProtoMsg(redelegation)]),
    ack: buildMsgResponseString(MsgBeginRedelegateResponse, {
      completionTime: getCompletionTime(),
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
};

export function createMockAckMap(mockMap: typeof protoMsgMocks) {
  const res = Object.values(mockMap).reduce((acc, { msg, ack }) => {
    acc[msg] = ack;
    return acc;
  }, {});
  return res;
}

export const defaultMockAckMap: Record<string, string> =
  createMockAckMap(protoMsgMocks);
