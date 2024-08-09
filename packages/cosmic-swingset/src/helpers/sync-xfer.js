// @ts-check

import { Far } from '@endo/far';

// FIXME: for debugging the buffer splitting/rejoining:
// const DEFAULT_BUFFER_SIZE = 12;
const DEFAULT_BUFFER_SIZE = 64 * 1024;
export { DEFAULT_BUFFER_SIZE };

// const TRANSFER_UNSPECIFIED = 0;
const TRANSFER_CLIENT_READY = 1;
const TRANSFER_READY_TO_READ = 2;
const TRANSFER_READ_PARTIAL = 3;
const TRANSFER_READ_DONE = 4;

const { Fail } = assert;

const debug = (..._args) => {};

/**
 * @template T
 * @typedef {Generator<undefined, T, Uint8Array | undefined>} Decoder<T>
 */

/**
 * @typedef {Generator<Uint8Array | undefined, Uint8Array, Uint8Array>} Encoder<T>
 */

/**
 * @returns {Decoder<string>}
 */
export function* makeTextDecoder() {
  // console.error('created decoder!');
  const td = new TextDecoder('utf-8');
  let s = '';
  for (;;) {
    const buf = yield;
    // console.error('got buf', buf);
    if (buf === undefined) {
      return s;
    }
    s += td.decode(buf, { stream: true });
  }
}
harden(makeTextDecoder);

/**
 * @param {string} input
 * @returns {Encoder}
 */
export function* makeTextEncoder(input) {
  const te = new TextEncoder();

  let buf = yield;

  // TODO: Maybe encode partials directly into buf, not create a fresh one.
  buf = te.encode(input);
  return buf;
}
harden(makeTextEncoder);

export const makeTransferClient = sharedBuf => {
  const control = new Int32Array(sharedBuf, 0, 2);
  const outb = new Uint8Array(control.buffer, 2 * Int32Array.BYTES_PER_ELEMENT);

  return Far('TransferClient', {
    prepareToRead(cb) {
      control[0] = TRANSFER_CLIENT_READY;
      cb(sharedBuf);
      Atomics.wait(control, 0, TRANSFER_CLIENT_READY);
      debug('current state', control[0]);
    },
    /**
     * @template T
     * @param {Decoder<T>} decoder
     */
    read(decoder) {
      decoder.next();
      Atomics.wait(control, 0, TRANSFER_READY_TO_READ);
      while (control[0] === TRANSFER_READ_PARTIAL) {
        const thisTransfer = Math.min(control[1], outb.byteLength);
        const s = decoder.next(outb.subarray(0, thisTransfer));
        debug('partial decode', s);

        debug('notify TRANSFER_CLIENT_READY');
        control[0] = TRANSFER_CLIENT_READY;
        Atomics.notify(control, 0);
        debug('waiting to exit TRANSFER_CLIENT_READY');
        Atomics.wait(control, 0, TRANSFER_CLIENT_READY);
      }

      decoder.next(outb.subarray(0, control[1]));
      const last = decoder.next();
      last.done || Fail`expected last decode to be done`;
      return /** @type {T} */ (last.value);
    },
  });
};
harden(makeTransferClient);

export const makeTransferServer = sharedBuf => {
  const control = new Int32Array(sharedBuf, 0, 2);
  const outb = new Uint8Array(control.buffer, 2 * Int32Array.BYTES_PER_ELEMENT);

  return Far('TransferServer', {
    prepareToWrite(cb) {
      if (control[0] !== TRANSFER_CLIENT_READY) {
        throw Error(`Unexpected transfer state ${control[0]}`);
      }
      cb();
      debug('notifying TRANSFER_READY_TO_WAIT');
      control[0] = TRANSFER_READY_TO_READ;
      Atomics.notify(control, 0);
    },
    /**
     * @param {Encoder} encoder
     */
    write(encoder) {
      // Prepare the generator.
      encoder.next();
      let { value: buf, done } = encoder.next(outb);
      for (;;) {
        if (buf === undefined) {
          // They used our buffer.
          buf = outb;
        }
        let i = 0;
        while (i < buf.length) {
          const thisTransfer = Math.min(buf.length - i, outb.byteLength);
          control[1] = thisTransfer;
          if (outb !== buf) {
            outb.set(buf.subarray(i, i + thisTransfer));
          }
          i += thisTransfer;

          debug(
            'notifying',
            control[0] === TRANSFER_READ_DONE ? 'done' : 'more',
            outb,
            buf,
            i,
            thisTransfer,
            buf.subarray(i, i + thisTransfer),
          );
          control[0] =
            i < buf.length ? TRANSFER_READ_PARTIAL : TRANSFER_READ_DONE;
          Atomics.notify(control, 0);
          debug('waiting to exit TRANSFER_READ_PARTIAL');
          Atomics.wait(control, 0, TRANSFER_READ_PARTIAL);
        }

        if (done) {
          break;
        }
        ({ value: buf, done } = encoder.next(outb));
      }
      debug('transfer write done');
    },
  });
};
