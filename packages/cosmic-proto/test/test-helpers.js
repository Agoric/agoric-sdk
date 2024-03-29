import test from 'ava';
import { toBase64, fromBase64 } from '@cosmjs/encoding';
import { cosmos } from '../dist/codegen/cosmos/bundle.js';
import {
  getSigningAgoricClientOptions,
  makeProtoConverter,
  typedJson,
} from '../dist/index.js';

const mockMsgSend = {
  fromAddress: 'agoric1from',
  toAddress: 'agoric1to',
  amount: [{ denom: 'ucosm', amount: '1' }],
};

test('MsgSend', t => {
  t.like(cosmos.bank.v1beta1.MsgSend.toProtoMsg(mockMsgSend), {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
  });
});

test('registry', t => {
  const { registry } = getSigningAgoricClientOptions();
  t.truthy(registry.lookupType('/cosmos.bank.v1beta1.MsgSend'));

  const proto = registry.encodeAsAny({
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: mockMsgSend,
  });
  t.like(proto, {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
  });

  t.deepEqual(registry.decode(proto), mockMsgSend);
});

test('normalize', t => {
  const { registry } = getSigningAgoricClientOptions();
  const convert = makeProtoConverter(registry);

  const protoJson = {
    '@type': '/cosmos.bank.v1beta1.MsgSend',
    ...mockMsgSend,
  };

  const proto = registry.encodeAsAny({
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: mockMsgSend,
  });
  t.deepEqual(convert(proto), protoJson);
  const { '@type': _, ...value } = protoJson;
  t.deepEqual(registry.decode(proto), value);
});

test('typedJson', t => {
  const address = 'addr';
  const qabr = typedJson('/cosmos.bank.v1beta1.QueryAllBalancesRequest', {
    address,
    // @ts-expect-error invalid field
    other: 3,
  });
  t.deepEqual(qabr, {
    '@type': '/cosmos.bank.v1beta1.QueryAllBalancesRequest',
    address,
    other: 3, // retained because there's no runtime validation
  });

  const msgSend = typedJson('/cosmos.bank.v1beta1.MsgSend', {
    fromAddress: address,
    toAddress: address,
    amount: [{ denom: 'ucosm', amount: '1' }],
    // @ts-expect-error invalid field
    other: 3,
  });
  t.deepEqual(msgSend, {
    '@type': '/cosmos.bank.v1beta1.MsgSend',
    fromAddress: address,
    toAddress: address,
    amount: [{ denom: 'ucosm', amount: '1' }],
    other: 3, // retained because there's no runtime validation
  });
});

test('cosmos/MsgDelegate', t => {
  const { MsgDelegate } = cosmos.staking.v1beta1;
  const { TxBody } = cosmos.tx.v1beta1;

  const msg = MsgDelegate.toProtoMsg({
    delegatorAddress:
      'osmo10kp2fq4nllqvk8gfs6rrl3xtcj7m5fqucemty0f968flm6h3n0hqws6j3q',
    validatorAddress: 'osmovaloper1qjtcxl86z0zua2egcsz4ncff2gzlcndzs93m43',
    amount: { denom: 'uosmo', amount: '10' },
  });

  const bytes = TxBody.encode(
    TxBody.fromPartial({
      messages: [msg],
    }),
  ).finish();

  const packet = JSON.stringify({
    type: 1,
    data: toBase64(bytes),
    memo: '',
  });
  t.log('packet', packet);
  t.truthy(packet);
});

test('cosmos/MsgDelegateResponse', t => {
  const { MsgDelegateResponse } = cosmos.staking.v1beta1;
  const response =
    '{"result":"Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U="}';
  const { result } = JSON.parse(response);
  const msg = MsgDelegateResponse.decode(fromBase64(result));
  t.deepEqual(msg, {});
});
