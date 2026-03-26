// @ts-check
import test from 'ava';

import { ModuleAccount as ModuleAccountType } from '../dist/codegen/cosmos/auth/v1beta1/auth.js';
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
import { MsgTransfer as MsgTransferOrig } from '../dist/codegen/ibc/applications/transfer/v1/tx.js';

/**
 * @import {ExecutionContext, Macro} from 'ava';
 */

const ModuleAccount = CodecHelper(ModuleAccountType);
const MsgTransfer = CodecHelper(MsgTransferOrig);

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

test('MsgTransfer basic', t => {
  const msgTransfer = MsgTransfer.typedJson({
    sender: 'agoric1from',
    receiver: 'agoric1to',
    token: { denom: 'ucosm', amount: '1' },
    sourcePort: 'transfer',
    sourceChannel: 'channel-0',
  });
  const expected = {
    '@type': '/ibc.applications.transfer.v1.MsgTransfer',
    sender: 'agoric1from',
    receiver: 'agoric1to',
    timeoutHeight: {},
    token: { denom: 'ucosm', amount: '1' },
    sourcePort: 'transfer',
    sourceChannel: 'channel-0',
  };
  t.deepEqual(msgTransfer, expected);
});

test('MsgTransfer typedJson empty', t => {
  const msgTransfer = MsgTransfer.typedJson({});
  t.deepEqual(msgTransfer, {
    '@type': '/ibc.applications.transfer.v1.MsgTransfer',
    timeoutHeight: {},
    token: { amount: '0' },
  });
});

/**
 * @template {any[]} [Args=any[]]
 * @typedef {object} ParityTestCase
 * @property {(...args: Args) => unknown} callA - method to test (e.g. 'typedJson')
 * @property {Args} args - arguments to the method
 * @property {any} expectedA - expected result of the method call
 * @property {(...args: Args) => unknown} callB - method to test (e.g. 'typedJson')
 * @property {any} [failureB] - expected failure result for objectB (optional)
 */

/** @type {Macro<[ParityTestCase]>} */
const codecParity = test.macro((t, tc) => {
  const { callA, args, expectedA, callB, failureB } = tc;
  const resultA = callA(...args);
  t.deepEqual(resultA, expectedA, `resultA should match expected`);

  const resultB = callB(...args);
  if (failureB) {
    t.deepEqual(resultB, failureB, `resultB should match expected failure`);
    return;
  }
  t.deepEqual(resultB, expectedA, `resultB should match expected`);
});

/** @type {Omit<ParityTestCase, 'args'>} */
const emptyMsgTransferTestCase = {
  callA: message => MsgTransfer.toJSON(message),
  expectedA: {
    encoding: '',
    memo: '',
    receiver: '',
    sender: '',
    sourceChannel: '',
    sourcePort: '',
    timeoutHeight: {
      revisionHeight: '0',
      revisionNumber: '0',
    },
    timeoutTimestamp: '0',
    token: {
      amount: '0',
      denom: '',
    },
  },
  callB: message =>
    MsgTransferOrig.toJSON(MsgTransferOrig.fromPartial(message)),
};

const {
  timeoutHeight: _1,
  token: _2,
  ...emptyMsgTransferFailureB
} = emptyMsgTransferTestCase.expectedA;

const failedEmptyMsgTransferTestCase = {
  ...emptyMsgTransferTestCase,
  failureB: emptyMsgTransferFailureB,
};

test('MsgTransfer toJSON empty', codecParity, {
  ...failedEmptyMsgTransferTestCase,
  args: [{}],
});

test('MsgTransfer toJSON with nonsense', codecParity, {
  ...failedEmptyMsgTransferTestCase,
  args: [{ nonsense: 'ignored' }],
});

const {
  token: { amount: _3, ...tokenRest },
  ...expectedMsgTransferWithoutToken
} = emptyMsgTransferTestCase.expectedA;
const failedEmptySubmessagesMsgTransferTestCase = {
  ...emptyMsgTransferTestCase,
  failureB: {
    ...expectedMsgTransferWithoutToken,
    token: {
      amount: '',
      ...tokenRest,
    },
  },
};

test('MsgTransfer toJSON with empty submessages', codecParity, {
  ...failedEmptySubmessagesMsgTransferTestCase,
  args: [
    {
      timeoutHeight: {},
      token: {},
    },
  ],
});

test('MsgTransfer toJSON with zero token amount', codecParity, {
  ...emptyMsgTransferTestCase,
  args: [{ timeoutHeight: {}, token: { amount: '0' } }],
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
  });

  t.deepEqual(
    help.fromPartial({
      address,
      // @ts-expect-error invalid field
      bad: 'nono',
    }),
    {
      address,
      resolveDenom: false,
      pagination: undefined,
    },
  );

  t.deepEqual(help.fromTyped(qabr), { address });

  const aminoMessage = {
    type: help.typeUrl,
    value: { address, resolveDenom: false },
  };
  t.deepEqual(help.fromTyped(aminoMessage), { address, resolveDenom: false });

  const jsonMessage = {
    typeUrl: '/cosmos.bank.v1beta1.QueryAllBalancesRequest',
    value: { address, resolveDenom: false, pagination: undefined },
  };
  t.deepEqual(help.fromTyped(jsonMessage), { address, resolveDenom: false });

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

test('CodecHelper agd q auth module-account', t => {
  const samples = {
    agd47: {
      account: {
        '@type': '/cosmos.auth.v1beta1.ModuleAccount',
        base_account: {
          address: 'agoric1ae0lmtzlgrcnla9xjkpaarq5d5dfez63h3nucl',
          pub_key: null,
          account_number: '110',
          sequence: '0',
        },
        name: 'vbank/reserve',
        permissions: [],
      },
    },
    agd50: {
      account: {
        type: '/cosmos.auth.v1beta1.ModuleAccount',
        value: {
          account_number: 110,
          address: 'agoric1ae0lmtzlgrcnla9xjkpaarq5d5dfez63h3nucl',
          name: 'vbank/reserve',
          permissions: null,
          public_key: '',
          sequence: 0,
        },
      },
    },
  };

  for (const [key, value] of Object.entries(samples)) {
    const { account } = value;
    const decoded = ModuleAccount.fromTyped(account);
    t.like(
      decoded,
      { address: 'agoric1ae0lmtzlgrcnla9xjkpaarq5d5dfez63h3nucl' },
      `${key} has correct data`,
    );
  }
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
    typeUrlToGrpcPath(ibc.applications.transfer.v1.QueryDenomRequest.typeUrl),
    '/ibc.applications.transfer.v1.Query/Denom',
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
