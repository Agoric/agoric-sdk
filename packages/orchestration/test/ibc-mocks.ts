import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import {
  buildMsgResponseString,
  buildQueryResponseString,
  buildMsgErrorString,
  buildTxPacketString,
  buildQueryPacketString,
} from '../tools/ibc-mocks.js';

const responses = {
  delegate: buildMsgResponseString(MsgDelegateResponse, {}),
  queryBalance: buildQueryResponseString(QueryBalanceResponse, {
    balance: { amount: '0', denom: 'uatom' },
  }),
  error5: buildMsgErrorString(
    'ABCI code: 5: error handling packet: see events for details',
  ),
};

export const protoMsgMocks = {
  delegate: {
    // delegate 10 uatom from cosmos1test to cosmosvaloper1test
    msg: buildTxPacketString([
      MsgDelegate.toProtoMsg({
        amount: {
          denom: 'uatom',
          amount: '10',
        },
        delegatorAddress: 'cosmos1test',
        validatorAddress: 'cosmosvaloper1test',
      }),
    ]),
    ack: responses.delegate,
  },
  queryBalance: {
    // query balance of uatom for cosmos1test
    msg: buildQueryPacketString([
      QueryBalanceRequest.toProtoMsg({
        address: 'cosmos1test',
        denom: 'uatom',
      }),
    ]),
    ack: responses.queryBalance,
  },
  error: {
    ack: responses.error5,
  },
};

export const defaultMockAckMap: Record<string, string> = {
  [protoMsgMocks.delegate.msg]: protoMsgMocks.delegate.ack,
  [protoMsgMocks.queryBalance.msg]: protoMsgMocks.queryBalance.ack,
};
