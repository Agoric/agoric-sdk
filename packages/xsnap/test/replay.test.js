/* eslint-env node */

import test from 'ava';

import * as proc from 'child_process';
import fs from 'fs';
import * as os from 'os';
import { tmpName } from 'tmp';

import { recordXSnap, replayXSnap } from '../src/replay.js';

import { options, encode, decode } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type(), fs, tmpName }; // WARNING: ambient

const transcript1 = [
  [
    '/xsnap-tests/00000-options.json',
    `{"os":"${io.os}","name":"xsnap test worker","debug":false,"meteringLimit":100000000}`,
  ],
  [
    '/xsnap-tests/00001-evaluate.dat',
    'issueCommand(new TextEncoder().encode("Hello, World!").buffer);',
  ],
  ['/xsnap-tests/00002-command.dat', 'Hello, World!'],
  ['/xsnap-tests/00003-reply.dat', ''],
];

test('record: evaluate and issueCommand', async t => {
  const opts = options(io);

  /** @type { Map<string, Uint8Array> } */
  const files = new Map();
  const writeFileSync = (fn, bs) => files.set(fn, bs.slice());

  const vat = await recordXSnap(opts, '/xsnap-tests/', { writeFileSync });

  await vat.evaluate(
    `issueCommand(new TextEncoder().encode("Hello, World!").buffer);`,
  );
  await vat.close();
  t.deepEqual(opts.messages, ['Hello, World!']);

  t.deepEqual(
    transcript1,
    [...files].map(([k, v]) => [k, decode(v)]),
  );
});

test('replay', async t => {
  const opts = options(io);

  /** @type { Map<string, Uint8Array> } */
  const files = new Map(transcript1.map(([k, v]) => [k, encode(v)]));
  const mockFS = {
    readdirSync: (_folder, _opts) => [...files.keys()],
    readFileSync: (n, encoding) => {
      const bytes = files.get(n);
      if (bytes === undefined) {
        throw RangeError(n);
      }
      if (encoding) {
        return decode(bytes);
      } else {
        return Buffer.from(bytes);
      }
    },
  };

  /** @typedef { any } FileMethods too much trouble to get exactly right. */
  const done = await replayXSnap(
    opts,
    ['/xs-test/'],
    /** @type { FileMethods } */ (mockFS),
  );

  t.deepEqual(done, [
    ['/xs-test/', 1, 'evaluate'],
    ['/xs-test/', 2, 'command'],
    ['/xs-test/', 3, 'reply'],
  ]);
});
