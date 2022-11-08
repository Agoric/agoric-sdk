import tmp from 'tmp';
import { test } from './prepare-test-env-ava.js';

import { makeMemoryMappedCircularBuffer } from '../src/flight-recorder.js';

test('flight-recorder sanity', async t => {
  const { name: tmpFile, removeCallback } = tmp.fileSync();
  const { writeJSON: slogSender, readCircBuf } =
    await makeMemoryMappedCircularBuffer({
      circularBufferSize: 512,
      circularBufferFilename: tmpFile,
    });
  slogSender({ type: 'start' });

  const len0 = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT);
  const { done: done0 } = readCircBuf(len0);
  t.false(done0, 'readCircBuf should not be done');
  const dv0 = new DataView(len0.buffer);
  const buf0 = new Uint8Array(Number(dv0.getBigUint64(0)));
  const { done: done0b } = readCircBuf(buf0, len0.byteLength);
  t.false(done0b, 'readCircBuf should not be done');
  const buf0Str = new TextDecoder().decode(buf0);
  t.is(buf0Str, `\n{"type":"start"}`, `start compare failed`);

  const last = 500;
  for (let i = 0; i < last; i += 1) {
    slogSender({ type: 'iteration', iteration: i });
  }

  let offset = 0;
  const len1 = new Uint8Array(BigUint64Array.BYTES_PER_ELEMENT);
  for (let i = 490; i < last; i += 1) {
    const { done: done1 } = readCircBuf(len1, offset);
    offset += len1.byteLength;
    t.false(done1, `readCircBuf ${i} should not be done`);
    const dv1 = new DataView(len1.buffer);
    const buf1 = new Uint8Array(Number(dv1.getBigUint64(0)));
    const { done: done1b } = readCircBuf(buf1, offset);
    offset += buf1.byteLength;
    t.false(done1b, `readCircBuf ${i} should not be done`);
    const buf1Str = new TextDecoder().decode(buf1);
    t.is(
      buf1Str,
      `\n{"type":"iteration","iteration":${i}}`,
      `iteration ${i} compare failed`,
    );
  }

  const { done: done2 } = readCircBuf(len1, offset);
  t.assert(done2, `readCircBuf ${last} should be done`);
  // console.log({ tmpFile });
  removeCallback();
});
