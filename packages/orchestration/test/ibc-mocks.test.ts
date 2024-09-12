import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { QueryDelegatorDelegationsResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import {
  buildMsgErrorString,
  buildMsgResponseString,
  buildQueryPacketString,
  buildQueryResponseString,
  buildTxPacketString,
  parseOutgoingQueryPacket,
  parseOutgoingTxPacket,
} from '../tools/ibc-mocks.js';

test('buildMsgResponseString matches observed values in e2e testing', t => {
  t.is(
    buildMsgResponseString(MsgDelegateResponse, {}),
    'eyJyZXN1bHQiOiJFaTBLS3k5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMazF6WjBSbGJHVm5ZWFJsVW1WemNHOXVjMlU9In0=',
  );
});

test('buildMsgErrorString matches observed values in e2e testing', t => {
  t.is(
    buildMsgErrorString(),
    'eyJlcnJvciI6IkFCQ0kgY29kZTogNTogZXJyb3IgaGFuZGxpbmcgcGFja2V0OiBzZWUgZXZlbnRzIGZvciBkZXRhaWxzIn0=',
    'ABCI code: 5: error handling packet',
  );

  t.is(
    buildMsgErrorString(
      'ABCI code: 5: error handling packet: see events for details',
    ),
    'eyJlcnJvciI6IkFCQ0kgY29kZTogNTogZXJyb3IgaGFuZGxpbmcgcGFja2V0OiBzZWUgZXZlbnRzIGZvciBkZXRhaWxzIn0=',
  );
});

test('buildQueryResponseString matches observed values in e2e testing', t => {
  t.is(
    buildQueryResponseString(QueryBalanceResponse, {
      balance: { amount: '0', denom: 'uatom' },
    }),
    'eyJyZXN1bHQiOiJleUprWVhSaElqb2lRMmMwZVVSQmIwdERaMVl4V1ZoU2RtSlNTVUpOUVQwOUluMD0ifQ==',
    'QueryBalanceResponse',
  );
});

test('build Tx Packet', t => {
  const obj = {
    amount: {
      denom: 'uatom',
      amount: '10',
    },
    delegatorAddress: 'cosmos1test',
    validatorAddress: 'cosmosvaloper1test',
  };
  const encodedPacket = buildTxPacketString([MsgDelegate.toProtoMsg(obj)]);
  t.snapshot(encodedPacket);
  const parsedPacket = parseOutgoingTxPacket(encodedPacket);
  t.snapshot(parsedPacket);
  t.is(parsedPacket.messages[0].typeUrl, '/cosmos.staking.v1beta1.MsgDelegate');
  const decoded = MsgDelegate.decode(
    parsedPacket.messages[0].value as unknown as Uint8Array,
  );
  t.deepEqual(decoded, obj);
});

test('build Query Packet', t => {
  const obj = {
    address: 'cosmos1test',
    denom: 'uatom',
  };
  const encodedPacket = buildQueryPacketString([
    QueryBalanceRequest.toProtoMsg(obj),
  ]);
  t.snapshot(encodedPacket);
  const parsedPacket = parseOutgoingQueryPacket(encodedPacket);
  t.snapshot(parsedPacket);
  t.is(parsedPacket.requests[0].path, '/cosmos.bank.v1beta1.Query/Balance');
  const decoded = QueryBalanceRequest.decode(
    parsedPacket.requests[0].data as unknown as Uint8Array,
  );
  t.deepEqual(decoded, obj);
});

test('build Query Response', t => {
  const obj = {
    delegationResponses: [
      {
        delegation: {
          delegatorAddress: 'cosmos1test',
          validatorAddress: 'cosmosvaloper1test',
          shares: '1000000',
        },
        balance: { denom: 'uatom', amount: '1000000' },
      },
    ],
  };
  const encoded = buildQueryResponseString(
    QueryDelegatorDelegationsResponse,
    obj,
  );
  t.snapshot(encoded);
  const decoded = QueryDelegatorDelegationsResponse.decode(
    encoded as unknown as Uint8Array,
  );
  t.deepEqual(decoded, obj);
});
