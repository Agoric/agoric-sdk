import '@endo/init/debug.js';
import test from 'ava';
import { makeTextDecoder, makeTextEncoder } from '../src/helpers/sync-xfer.js';

test('text decoder', t => {
  const decoder = makeTextDecoder();
  decoder.next();
  const buf = new TextEncoder().encode('hello world bobob');
  let i = 0;
  while (i < buf.length) {
    const thisTransfer = Math.min(buf.length - i, 3);
    const s = decoder.next(buf.subarray(i, i + thisTransfer));
    t.log('partial decode', s);
    i += thisTransfer;
  }
  // t.log('last decode', decoder.next(buf.subarray(i, buf.length)));
  t.is(decoder.next().value, 'hello world bobob');
});

test('text encoder', t => {
  const bufs = [];
  const encoder = makeTextEncoder('hello world bobob');
  encoder.next();
  const outb = new Uint8Array(3);
  let { value: buf, done } = encoder.next(outb);
  for (;;) {
    if (buf === undefined) {
      // They used our buffer.
      buf = outb;
    }
    let i = 0;
    while (i < buf.length) {
      const thisTransfer = Math.min(buf.length - i, outb.byteLength);
      if (outb !== buf) {
        outb.set(buf.subarray(i, i + thisTransfer));
      }
      i += thisTransfer;
      t.log('partial encode', outb);
      bufs.push(Uint8Array.from(outb.subarray(0, thisTransfer)));
    }

    if (done) {
      break;
    }
    ({ value: buf, done } = encoder.next());
  }

  const full = Uint8Array.from(bufs.flatMap(b => Array.from(b)));
  const s = new TextDecoder().decode(full);
  t.is(s, 'hello world bobob');
});
