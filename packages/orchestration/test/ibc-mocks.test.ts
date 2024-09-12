import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { QueryDelegatorDelegationsResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import {
  CosmosQuery,
  CosmosResponse,
} from '@agoric/cosmic-proto/icq/v1/packet.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import {
  buildMsgErrorString,
  buildMsgResponseString,
  buildQueryPacketString,
  buildQueryResponseString,
  buildTxPacketString,
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
  const encoded = buildTxPacketString([MsgDelegate.toProtoMsg(obj)]);
  t.snapshot(encoded);

  const parsed = parseOutgoingTxPacket(encoded);
  const decoded = MsgDelegate.decode(parsed.messages[0].value);
  t.deepEqual(decoded, obj);
});

test('build Query Packet', t => {
  const obj = {
    address: 'cosmos1test',
    denom: 'uatom',
  };
  const b64 = buildQueryPacketString([QueryBalanceRequest.toProtoMsg(obj)]);
  t.snapshot(b64);

  const { data } = JSON.parse(atob(b64));
  const decodedQuery = CosmosQuery.decode(Buffer.from(data, 'base64'));
  const decodedRequest = QueryBalanceRequest.decode(
    decodedQuery.requests[0].data,
  );
  t.deepEqual(decodedRequest, obj);
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

  const { result } = JSON.parse(atob(encoded));
  const { data } = JSON.parse(atob(result));
  const cosmosResponse = CosmosResponse.decode(Buffer.from(data, 'base64'));
  const decodedResponseKey = cosmosResponse.responses[0].key;

  t.deepEqual(QueryDelegatorDelegationsResponse.decode(decodedResponseKey), {
    ...obj,
    pagination: undefined,
  });
});
