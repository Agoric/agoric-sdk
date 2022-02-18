/* global Buffer */
import { test } from '../tools/prepare-test-env-ava.js';

import {
  arrayEncoderStream,
  arrayDecoderStream,
} from '../src/worker-protocol.js';
import {
  encode,
  netstringEncoderStream,
  netstringDecoderStream,
} from '../src/netstring.js';

test('arrayEncoderStream', async t => {
  const e = arrayEncoderStream();
  const chunks = [];
  e.on('data', data => chunks.push(data));
  e.write([]);

  const eq = expected => {
    t.deepEqual(
      chunks.map(buf => buf.toString()),
      expected,
    );
  };
  eq([`[]`]);

  e.write(['command', { foo: 1 }]);
  eq([`[]`, `["command",{"foo":1}]`]);
});

test('encode stream', async t => {
  const aStream = arrayEncoderStream();
  const nsStream = netstringEncoderStream();
  aStream.pipe(nsStream);
  const chunks = [];
  nsStream.on('data', data => chunks.push(data));
  const eq = expected => {
    t.deepEqual(
      chunks.map(buf => buf.toString()),
      expected,
    );
  };

  aStream.write([1]);
  eq(['3:[1],']);

  aStream.write(['command', { foo: 4 }]);
  eq(['3:[1],', '21:["command",{"foo":4}],']);
});

test('decode stream', async t => {
  const nsStream = netstringDecoderStream();
  const aStream = arrayDecoderStream();
  nsStream.pipe(aStream);
  const write = s => {
    nsStream.write(Buffer.from(s));
  };

  const msgs = [];
  aStream.on('data', msg => msgs.push(msg));

  const eq = expected => {
    t.deepEqual(msgs, expected);
  };

  let buf = encode(Buffer.from(JSON.stringify([1])));
  write(buf.slice(0, 1));
  eq([]);
  write(buf.slice(1));
  eq([[1]]);
  msgs.pop();

  buf = encode(Buffer.from(JSON.stringify(['command', { foo: 2 }])));
  write(buf.slice(0, 4));
  eq([]);
  write(buf.slice(4));
  eq([['command', { foo: 2 }]]);
});
