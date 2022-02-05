// @ts-check
/* global BigUint64Array */
import tmp from 'tmp';
import { test } from './prepare-test-env-ava.js';

import { makeMemoryMappedCircularBuffer } from '../src/flight-recorder.js';

test('flight-recorder sanity', t => {
  const { name: tmpFile } = tmp.fileSync();
  console.log(tmpFile);
  const { writeJSON: slogSender, readCircBuf } = makeMemoryMappedCircularBuffer(
    {
      circularBufferSize: 512,
      circularBufferFile: tmpFile,
    },
  );
  slogSender({ type: 'start' });

  const len0 = new BigUint64Array(readCircBuf(new Uint8Array(8)).buffer);
  const buf0 = readCircBuf(new Uint8Array(Number(len0[0])), 8);
  const buf0Str = new TextDecoder().decode(buf0);
  t.is(buf0Str, `\n{"type":"start"}`);

  for (let i = 0; i < 500; i += 1) {
    slogSender({ type: 'iteration', iteration: i });
  }

  const len1 = new BigUint64Array(readCircBuf(new Uint8Array(8)).buffer);
  const buf1 = readCircBuf(new Uint8Array(Number(len1[0])), 8);
  const buf1Str = new TextDecoder().decode(buf1);
  t.is(buf1Str, `\n{"type":"iteration","iteration":490}`);
});
