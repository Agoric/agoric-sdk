// @ts-check
import test from 'ava';

import { cosmos } from '../dist/codegen/cosmos/bundle.js';
import { ibc } from '../dist/codegen/ibc/bundle.js';
import { icq } from '../dist/codegen/icq/bundle.js';
import { Codec, CodecHelper } from '../dist/codec-helpers.js';
import {
  typeUrlToGrpcPath,
  toRequestQueryJson,
  typedJson,
} from '../dist/helpers.js';
import { QueryAllBalancesRequest } from '../dist/codegen/cosmos/bank/v1beta1/query.js';
import { MsgSend } from '../dist/codegen/cosmos/bank/v1beta1/tx.js';

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

test('CodecHelper', t => {
  const address = 'addr';
  const help = CodecHelper(QueryAllBalancesRequest);
  const qabr = help.typedJson({
    address,
    // @ts-expect-error invalid field
    other: 3,
  });
  t.deepEqual(qabr, {
    '@type': help.typeUrl,
    address,
    pagination: undefined,
  });

  // @ts-expect-error
  qabr.zingo = { abc: 3 };
  t.deepEqual(qabr, {
    '@type': help.typeUrl,
    address,
    pagination: undefined,
    zingo: { abc: 3 },
  });
  t.deepEqual(help.fromTyped(qabr), {
    address,
    pagination: undefined,
  });
  t.deepEqual(
    help.fromTyped(qabr, ['zingo']),
    {
      address,
      pagination: undefined,
      abc: 3,
    },
    'fromTyped expands embedded zingo',
  );

  const aminoMessage = help.typedAmino({ address });
  // @ts-expect-error
  aminoMessage.value.zongo = { def: 6 };
  t.deepEqual(aminoMessage, {
    type: help.typeUrl,
    value: {
      address,
      pagination: undefined,
      zongo: { def: 6 },
    },
  });
  t.deepEqual(help.fromTyped(aminoMessage), {
    address,
    pagination: undefined,
  });
  t.deepEqual(help.fromTyped(aminoMessage, ['zongo', 'zon_go']), {
    address,
    pagination: undefined,
    def: 6,
  });

  const jsonMessage = help.typedEncode({ address });
  // @ts-expect-error
  jsonMessage.value.zungo = { ghi: 9 };
  t.deepEqual(jsonMessage, {
    typeUrl: '/cosmos.bank.v1beta1.QueryAllBalancesRequest',
    value: {
      address,
      pagination: undefined,
      zungo: { ghi: 9 },
    },
  });
  t.deepEqual(help.fromTyped(jsonMessage), {
    address,
    pagination: undefined,
  });
  t.deepEqual(help.fromTyped(jsonMessage, ['zungo', 'zunGo']), {
    address,
    pagination: undefined,
    ghi: 9,
  });

  const msgSend = CodecHelper(MsgSend).typedJson({
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
  });
});

test('typeUrlToGrpcPath', t => {
  t.is(
    typeUrlToGrpcPath(cosmos.bank.v1beta1.QueryBalanceRequest.typeUrl),
    '/cosmos.bank.v1beta1.Query/Balance',
  );
  t.is(
    typeUrlToGrpcPath(
      cosmos.staking.v1beta1.QueryDelegatorDelegationsRequest.typeUrl,
    ),
    '/cosmos.staking.v1beta1.Query/DelegatorDelegations',
  );
  t.is(
    typeUrlToGrpcPath(
      ibc.applications.transfer.v1.QueryDenomTraceRequest.typeUrl,
    ),
    '/ibc.applications.transfer.v1.Query/DenomTrace',
  );
  t.is(
    typeUrlToGrpcPath(icq.v1.QueryParamsRequest.typeUrl),
    '/icq.v1.Query/Params',
  );
  t.throws(
    () => typeUrlToGrpcPath(cosmos.bank.v1beta1.QueryBalanceResponse.typeUrl),
    { message: /Invalid typeUrl(.*?)Must be a Query Request/ },
  );
  t.throws(() => typeUrlToGrpcPath(cosmos.bank.v1beta1.MsgSend.typeUrl), {
    message: /Invalid typeUrl(.*?)Must be a Query Request/,
  });
});

test('toRequestQueryJson', t => {
  t.like(
    toRequestQueryJson(
      Codec(cosmos.bank.v1beta1.QueryBalanceRequest).toProtoMsg({
        address: mockMsgSend.fromAddress,
        denom: mockMsgSend.amount[0].denom,
      }),
    ),
    {
      path: '/cosmos.bank.v1beta1.Query/Balance',
    },
  );
  t.like(
    toRequestQueryJson(
      Codec(cosmos.bank.v1beta1.QueryBalanceRequest).toProtoMsg({
        address: mockMsgSend.fromAddress,
        denom: mockMsgSend.amount[0].denom,
      }),
      { height: 0n },
    ),
    {
      path: '/cosmos.bank.v1beta1.Query/Balance',
      height: '0',
    },
  );
});
