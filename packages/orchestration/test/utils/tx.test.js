import test from '@endo/ses-ava/prepare-endo.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any';
import { makeTxPacket, parsePacketAck } from '../../src/utils/tx.js';

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
      {
        typeUrl: mockMsg.typeUrl,
      },
    ]),
    '{"type":1,"data":"Cg0KCy9mb28uYmFyLnYx","memo":""}',
  );
  t.throws(() =>
    makeTxPacket([
      {
        typeUrl: mockMsg.typeUrl,
        value: new Uint8Array([1, 2, 3]),
      },
    ]),
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

test('parsePacketAck', t => {
  t.is(
    parsePacketAck(
      `{"result":"Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U="}`,
    ),
    'Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U=',
  );
  t.throws(
    () =>
      parsePacketAck(
        `{"error":"ABCI code: 5: error handling packet: see events for details"}`,
      ),
    {
      message: 'ABCI code: 5: error handling packet: see events for details',
    },
  );
  t.throws(
    () => parsePacketAck('{"foo":"bar"}'),
    {
      message: '{"foo":"bar"}',
    },
    'returns original string as error if `result` is not found',
  );
});
