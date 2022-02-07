// @ts-check
/* global BigUint64Array */
import tmp from 'tmp';
import { test } from './prepare-test-env-ava.js';

import { makeMemoryMappedCircularBuffer } from '../src/flight-recorder.js';

test('flight-recorder sanity', async t => {
  const { name: tmpFile, removeCallback } = tmp.fileSync();
  const { writeJSON: slogSender, readCircBuf } =
    await makeMemoryMappedCircularBuffer({
      circularBufferSize: 512,
      circularBufferFile: tmpFile,
    });
  slogSender({ type: 'start' });

  const len0 = new BigUint64Array(1);
  const { done: done0 } = readCircBuf(new Uint8Array(len0.buffer));
  t.false(done0, 'readCircBuf should not be done');
  const buf0 = new Uint8Array(Number(len0[0]));
  const { done: done0b } = readCircBuf(buf0, len0.byteLength);
  t.false(done0b, 'readCircBuf should not be done');
  const buf0Str = new TextDecoder().decode(buf0);
  t.is(buf0Str, `\n{"type":"start"}`);

  const last = 500;
  for (let i = 0; i < last; i += 1) {
    slogSender({ type: 'iteration', iteration: i });
  }

  let offset = 0;
  const len1 = new BigUint64Array(1);
  for (let i = 490; i < last; i += 1) {
    const { done: done1 } = readCircBuf(new Uint8Array(len1.buffer), offset);
    offset += len1.byteLength;
    t.false(done1, `readCircBuf ${i} should not be done`);
    const buf1 = new Uint8Array(Number(len1[0]));
    const { done: done1b } = readCircBuf(buf1, offset);
    offset += buf1.byteLength;
    t.false(done1b, `readCircBuf ${i} should not be done`);
    const buf1Str = new TextDecoder().decode(buf1);
    t.is(buf1Str, `\n{"type":"iteration","iteration":${i}}`);
  }

  const { done: done2 } = readCircBuf(new Uint8Array(len1.buffer), offset);
  t.assert(done2, `readCircBuf ${last} should be done`);
  removeCallback();
});
