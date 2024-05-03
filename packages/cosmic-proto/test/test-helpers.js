// @ts-check
import test from 'ava';

import { cosmos } from '../dist/codegen/cosmos/bundle.js';
import { ibc } from '../dist/codegen/ibc/bundle.js';
import { icq } from '../dist/codegen/icq/bundle.js';
import { typedJson } from '../dist/index.js';
import { typeUrlToGrpcPath, toRequestQueryJson } from '../dist/helpers.js';

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
      cosmos.bank.v1beta1.QueryBalanceRequest.toProtoMsg({
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
      cosmos.bank.v1beta1.QueryBalanceRequest.toProtoMsg({
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
