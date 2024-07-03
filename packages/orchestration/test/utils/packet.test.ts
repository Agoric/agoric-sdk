import test from '@endo/ses-ava/prepare-endo.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { RequestQuery } from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { decodeBase64 } from '@endo/base64';
import {
  makeTxPacket,
  parseTxPacket,
  parseQueryPacket,
  makeQueryPacket,
} from '../../src/utils/packet.js';

test('makeTxPacket', t => {
  const mockMsg = {
    typeUrl: '/foo.bar.v1',
    value: 'CgYKBHNlbnQ=',
  };

  t.is(
    makeTxPacket([mockMsg]),
    '{"type":1,"data":"ChcKCy9mb28uYmFyLnYxEggKBgoEc2VudA==","memo":""}',
    'makes a packet from messages',
  );
  t.is(
    makeTxPacket([mockMsg], { memo: 'hello', timeoutHeight: 10000n }),
    '{"type":1,"data":"ChcKCy9mb28uYmFyLnYxEggKBgoEc2VudBIFaGVsbG8YkE4=","memo":""}',
    'accepts options for TxBody',
  );
  t.deepEqual(
    makeTxPacket([
      // @ts-expect-error missing value field
      {
        typeUrl: mockMsg.typeUrl,
      },
    ]),
    '{"type":1,"data":"Cg0KCy9mb28uYmFyLnYx","memo":""}',
    'Any.fromJSON() silently ignores missing `value` field',
  );
  t.throws(
    () =>
      makeTxPacket([
        {
          typeUrl: mockMsg.typeUrl,
          // @ts-expect-error testing bad input
          value: new Uint8Array([1, 2, 3]),
        },
      ]),
    undefined,
    'value cannot be Uint8Array',
  );
});

test('txToBase64', t => {
  t.deepEqual(
    Any.toJSON({
      typeUrl: '/foo.bar.v1',
      value: new Uint8Array([1, 2, 3]),
    }),
    {
      typeUrl: '/foo.bar.v1',
      value: 'AQID',
    },
  );
});

test('parseTxPacket', t => {
  t.is(
    parseTxPacket(
      `{"result":"Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U="}`,
    ),
    'Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U=',
  );
  t.throws(
    () =>
      parseTxPacket(
        `{"error":"ABCI code: 5: error handling packet: see events for details"}`,
      ),
    {
      message: 'ABCI code: 5: error handling packet: see events for details',
    },
  );
  t.throws(
    () => parseTxPacket('{"foo":"bar"}'),
    {
      message: 'expected either result or error: "{\\"foo\\":\\"bar\\"}"',
    },
    'returns original string as error if `result` is not found',
  );
});

test('makeQueryPacket', t => {
  const mockQuery = RequestQuery.toJSON(
    RequestQuery.fromPartial({
      path: '/cosmos.bank.v1beta1.Query/Balance',
      data: QueryBalanceRequest.encode(
        QueryBalanceRequest.fromPartial({
          address: 'cosmos1test',
          denom: 'uatom',
        }),
      ).finish(),
    }),
  );
  t.is(
    makeQueryPacket([mockQuery]),
    '{"data":"CjoKFAoLY29zbW9zMXRlc3QSBXVhdG9tEiIvY29zbW9zLmJhbmsudjFiZXRhMS5RdWVyeS9CYWxhbmNl","memo":""}',
    'makes a query packet from messages',
  );
  const requiredFields = {
    path: '/foo.bar.v1',
    data: new Uint8Array([1, 2, 3]),
  };
  t.deepEqual(
    RequestQuery.fromPartial(requiredFields),
    {
      ...requiredFields,
      height: 0n,
      prove: false,
    },
    'RequestQuery defaults to `height: 0n` and `prove: false`',
  );
});

test('queryToBase64', t => {
  t.deepEqual(
    RequestQuery.toJSON(
      RequestQuery.fromPartial({
        path: '/cosmos.bank.v1beta1.Query/Balance',
        data: new Uint8Array([1, 2, 3]),
      }),
    ),
    {
      path: '/cosmos.bank.v1beta1.Query/Balance',
      data: 'AQID',
      height: '0',
      prove: false,
    },
  );
});

test('parseQueryPacket', t => {
  const response = `{"result":"eyJkYXRhIjoiQ2c0eURBb0tDZ1YxWVhSdmJSSUJNQT09In0="}`;
  const expectedOutput = [
    {
      code: 0,
      log: '',
      info: '',
      index: '0',
      key: 'CgoKBXVhdG9tEgEw', // base64 encoded Uint8Array
      value: '',
      height: '0',
      codespace: '',
    },
  ];

  t.deepEqual(
    parseQueryPacket(response),
    expectedOutput,
    'parses a query response packet',
  );

  const multiResponse = `{"result":"eyJkYXRhIjoiQ2c0eURBb0tDZ1YxWVhSdmJSSUJNQW9PTWd3S0Nnb0ZkV0YwYjIwU0FUQT0ifQ=="}`;
  const multiParsed = parseQueryPacket(multiResponse);
  t.is(multiParsed.length, 2);
  for (const { key } of multiParsed) {
    t.deepEqual(QueryBalanceResponse.decode(decodeBase64(key)), {
      balance: {
        amount: '0',
        denom: 'uatom',
      },
    });
  }

  t.throws(
    () =>
      parseQueryPacket(
        `{"error":"ABCI code: 4: error handling packet: see events for details"}`,
      ),
    {
      message: 'ABCI code: 4: error handling packet: see events for details',
    },
  );

  t.throws(
    () => parseQueryPacket('{"foo":"bar"}'),
    {
      message: 'expected either result or error: "{\\"foo\\":\\"bar\\"}"',
    },
    'throws an error if `result` is not found',
  );
});
