import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
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

test('ibc-mocks - buildMsgResponseString matches observed values in e2e testing', t => {
  t.is(
    buildMsgResponseString(MsgDelegateResponse, {}),
    'eyJyZXN1bHQiOiJFaTBLS3k5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMazF6WjBSbGJHVm5ZWFJsVW1WemNHOXVjMlU9In0=',
  );
});

test('ibc-mocks - buildMsgErrorString matches observed values in e2e testing', t => {
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

test('ibcMocks - buildQueryResponseString matches observed values in e2e testing', t => {
  t.is(
    buildQueryResponseString(QueryBalanceResponse, {
      balance: { amount: '0', denom: 'uatom' },
    }),
    'eyJyZXN1bHQiOiJleUprWVhSaElqb2lRMmMwZVVSQmIwdERaMVl4V1ZoU2RtSlNTVUpOUVQwOUluMD0ifQ==',
    'QueryBalanceResponse',
  );
});

test('ibcMocks - build Tx Packet', t => {
  t.is(
    buildTxPacketString([
      MsgDelegate.toProtoMsg({
        amount: {
          denom: 'uatom',
          amount: '10',
        },
        delegatorAddress: 'cosmos1test',
        validatorAddress: 'cosmosvaloper1test',
      }),
    ]),
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXciLCJtZW1vIjoiIn0=',
  );
});

test('ibcMocks - build Query Packet', t => {
  t.is(
    buildQueryPacketString([
      QueryBalanceRequest.toProtoMsg({
        address: 'cosmos1test',
        denom: 'uatom',
      }),
    ]),
    'eyJkYXRhIjoiQ2pvS0ZBb0xZMjl6Ylc5ek1YUmxjM1FTQlhWaGRHOXRFaUl2WTI5emJXOXpMbUpoYm1zdWRqRmlaWFJoTVM1UmRXVnllUzlDWVd4aGJtTmwiLCJtZW1vIjoiIn0=',
  );
});
