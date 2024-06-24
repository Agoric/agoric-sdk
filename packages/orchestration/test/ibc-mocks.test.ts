import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { QueryBalanceResponse } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  buildMsgResponseString,
  buildMsgErrorString,
  buildQueryResponseString,
} from './ibc-mocks.js';
import { makeTxPacket } from '../src/utils/packet.js';

test('ibc-mocks - buildMsgResponseString', t => {
  // matches observed value in e2e testing with sim chains
  t.is(
    buildMsgResponseString(MsgDelegateResponse, {}),
    'eyJyZXN1bHQiOiJFaTBLS3k5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMazF6WjBSbGJHVm5ZWFJsVW1WemNHOXVjMlU9In0=',
  );
});

test('ibc-mocks - buildMsgErrorString', t => {
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

test('ibcMocks - buildQueryResponseString', t => {
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
    btoa(
      makeTxPacket([
        Any.toJSON(
          MsgDelegate.toProtoMsg({
            amount: {
              denom: 'uatom',
              amount: '10',
            },
            delegatorAddress: 'cosmos1test',
            validatorAddress: 'cosmosvaloper1test',
          }),
        ),
      ]),
    ),
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXciLCJtZW1vIjoiIn0=',
  );
});
