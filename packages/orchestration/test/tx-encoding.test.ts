import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawDelegatorRewardResponse,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { decodeBase64, encodeBase64 } from '@endo/base64';
import { tryDecodeResponse } from '../src/utils/cosmos.js';

const test = anyTest;

const scenario1 = {
  acct1: {
    address: 'agoric1spy36ltduehs5dmszfrp792f0k2emcntrql3nx',
  },
  validator: { address: 'agoric1valoper234', encoding: 'bech32' },
  delegations: {
    agoric1valoper234: { denom: 'uatom', amount: '200' },
  },
};

test('MsgWithdrawDelegatorReward: protobuf encoding reminder', t => {
  const actual = MsgWithdrawDelegatorReward.toProtoMsg({
    delegatorAddress: 'abc',
    validatorAddress: 'def',
  });

  const abc = [0x03, 0x61, 0x62, 0x63]; // wire type 3, a, b, c
  const def = [0x03, 0x64, 0x65, 0x66];
  t.deepEqual(actual, {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: Uint8Array.from([0x0a, ...abc, 0x12, ...def]),
  });
});

test('DelegateResponse decoding', t => {
  // executeEncodedTx() returns "acknowledge string"
  const ackStr =
    'Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U=';
  // That's base64 protobuf of an Any
  const any = Any.decode(decodeBase64(ackStr));

  t.like(any, { $typeUrl: '/google.protobuf.Any', typeUrl: '' });
  t.true(any.value instanceof Uint8Array);

  // @ts-expect-error we can tell this is the type from tye typeUrl
  const protoMsg: MsgDelegateResponseProtoMsg = Any.decode(any.value);
  t.like(protoMsg, {
    $typeUrl: '/google.protobuf.Any',
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegateResponse',
  });
  t.true(protoMsg.value instanceof Uint8Array);

  const msgD = MsgDelegateResponse.fromProtoMsg(protoMsg);
  t.deepEqual(msgD, {});
});

test('tryDecodeResponse from withdraw', t => {
  const ackStr =
    'ElIKPy9jb3Ntb3MuZGlzdHJpYnV0aW9uLnYxYmV0YTEuTXNnV2l0aGR' +
    'yYXdEZWxlZ2F0b3JSZXdhcmRSZXNwb25zZRIPCg0KBnVzdGFrZRIDMjAw';
  const msg = tryDecodeResponse(
    ackStr,
    MsgWithdrawDelegatorRewardResponse.fromProtoMsg,
  );
  t.deepEqual(msg, { amount: [{ amount: '200', denom: 'ustake' }] });
});

test('MsgWithdrawDelegatorRewardResponse encoding', t => {
  const { delegations } = scenario1;
  const response: MsgWithdrawDelegatorRewardResponse = {
    amount: Object.values(delegations),
  };
  const protoMsg = MsgWithdrawDelegatorRewardResponse.toProtoMsg(response);

  const typeUrl =
    '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse';
  t.like(protoMsg, { typeUrl });
  t.true(protoMsg.value instanceof Uint8Array);

  const any1 = Any.fromPartial(protoMsg);
  const any2 = Any.fromPartial({ value: Any.encode(any1).finish() });
  t.like(any2, { $typeUrl: '/google.protobuf.Any', typeUrl: '' });
  t.true(any2.value instanceof Uint8Array);

  const ackStr = encodeBase64(Any.encode(any2).finish());
  t.is(typeof ackStr, 'string');
  t.is(
    ackStr,
    'ElEKPy9jb3Ntb3MuZGlzdHJpYnV0aW9uLnYxYmV0YTEuTXNnV2l0aGRy' +
      'YXdEZWxlZ2F0b3JSZXdhcmRSZXNwb25zZRIOCgwKBXVhdG9tEgMyMDA=',
  );
});
