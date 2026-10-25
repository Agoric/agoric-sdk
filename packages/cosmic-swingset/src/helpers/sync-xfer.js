// @ts-check
// Layout, states, ownership, and codec handshakes: ../../docs/shared-memory-transfer.md
import { Far } from '@endo/far';

export const DEFAULT_BUFFER_SIZE = 64 * 1024;
export const TRANSFER_HEADER_BYTES = 2 * Int32Array.BYTES_PER_ELEMENT;
// dataLength is a nonnegative signed int32; payload size must fit that word.
export const MAX_TRANSFER_BUFFER_SIZE = TRANSFER_HEADER_BYTES + 2 ** 31 - 1;
export const TRANSFER_STATE = harden({
  IDLE: 0,
  READER_READY: 1,
  WRITER_READY: 2,
  CHUNK_AVAILABLE: 3,
  FINAL_CHUNK_AVAILABLE: 4,
  FINAL_CHUNK_CONSUMED: 5,
  ABORTED: 6,
});

/** @param {number} size */
export const assertTransferBufferSize = size => {
  if (
    !Number.isInteger(size) ||
    size <= TRANSFER_HEADER_BYTES ||
    size > MAX_TRANSFER_BUFFER_SIZE
  ) {
    throw Error(
      `Transfer buffer size must be an integer from ${TRANSFER_HEADER_BYTES + 1} to ${MAX_TRANSFER_BUFFER_SIZE}, got ${size}`,
    );
  }
};

/** @param {number} [size] */
export const makeTransferBuffer = (size = DEFAULT_BUFFER_SIZE) => {
  assertTransferBufferSize(size);
  return new SharedArrayBuffer(size);
};

/**
 * Fixed layout: [state:int32, dataLength:int32, payload:uint8[]].
 * @param {SharedArrayBuffer} buffer
 */
export const partitionTransferBuffer = buffer => {
  if (!(buffer instanceof SharedArrayBuffer))
    throw Error('Transfer requires a SharedArrayBuffer');
  assertTransferBufferSize(buffer.byteLength);
  if ('growable' in buffer && buffer.growable)
    throw Error('Transfer buffer must have a fixed size');
  return harden({
    control: new Int32Array(buffer, 0, 2),
    payload: new Uint8Array(buffer, TRANSFER_HEADER_BYTES),
  });
};

/**
 * @template T
 * @typedef {Generator<undefined, T, Uint8Array | undefined>} Decoder<T>
 */

/**
 * @typedef {Generator<Uint8Array | undefined, Uint8Array, Uint8Array>} Encoder
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

/**
 * @param {SharedArrayBuffer} buffer
 * @param {{ check: () => void }} [lifecycle]
 */
const makeTransferControl = (buffer, lifecycle) => {
  const { control, payload } = partitionTransferBuffer(buffer);
  const state = () => {
    lifecycle?.check();
    const current = Atomics.load(control, 0);
    if (current === TRANSFER_STATE.ABORTED)
      throw Error('Transfer aborted by peer');
    return current;
  };
  const expect = expected => {
    const current = state();
    if (current !== expected)
      throw Error(`Unexpected transfer state ${current}, expected ${expected}`);
  };
  const change = (previous, next) => {
    lifecycle?.check();
    const current = Atomics.compareExchange(control, 0, previous, next);
    if (current !== previous)
      throw Error(`Unexpected transfer state ${current}, expected ${previous}`);
    Atomics.notify(control, 0);
  };
  const waitForChange = expected => {
    // 'ok' means notified, not that a different state was published. Re-read
    // after every outcome, including 'not-equal', timeouts, and extra notifies.
    while (state() === expected) Atomics.wait(control, 0, expected, 100);
    return state();
  };
  const abort = error => {
    Atomics.store(control, 0, TRANSFER_STATE.ABORTED);
    Atomics.notify(control, 0);
    throw error;
  };
  return { control, payload, state, expect, change, waitForChange, abort };
};

/**
 * @param {SharedArrayBuffer} buffer
 * @param {{ check: () => void }} [lifecycle]
 */
export const makeTransferClient = (buffer, lifecycle) => {
  const protocol = makeTransferControl(buffer, lifecycle);
  const { control, payload, state, expect, change, waitForChange, abort } =
    protocol;
  let prepared = false;
  let reading = false;
  return Far('TransferClient', {
    /** @param {(buffer: SharedArrayBuffer) => void} register */
    prepareToRead(register) {
      try {
        if (prepared) throw Error('Transfer reader is already prepared');
        expect(TRANSFER_STATE.IDLE);
        prepared = true;
        change(TRANSFER_STATE.IDLE, TRANSFER_STATE.READER_READY);
        register(buffer);
        const current = waitForChange(TRANSFER_STATE.READER_READY);
        if (
          ![
            TRANSFER_STATE.WRITER_READY,
            TRANSFER_STATE.CHUNK_AVAILABLE,
            TRANSFER_STATE.FINAL_CHUNK_AVAILABLE,
          ].includes(current)
        ) {
          throw Error(
            `Unexpected transfer state ${current} after reader registration`,
          );
        }
      } catch (error) {
        prepared = false;
        abort(error);
      }
    },
    /**
     * @template T
     * @param {Decoder<T>} decoder
     * @returns {T}
     */
    read(decoder) {
      try {
        if (!prepared)
          throw Error('Transfer reader must be prepared before read');
        if (reading) throw Error('Transfer reader is already reading');
        reading = true;
        const initial = state();
        if (
          ![
            TRANSFER_STATE.WRITER_READY,
            TRANSFER_STATE.CHUNK_AVAILABLE,
            TRANSFER_STATE.FINAL_CHUNK_AVAILABLE,
          ].includes(initial)
        ) {
          throw Error(`Unexpected transfer state ${initial} before reading`);
        }
        if (decoder.next().done)
          throw Error('Decoder completed before receiving data');
        for (;;) {
          if (state() === TRANSFER_STATE.WRITER_READY)
            waitForChange(TRANSFER_STATE.WRITER_READY);
          const current = state();
          if (
            current !== TRANSFER_STATE.CHUNK_AVAILABLE &&
            current !== TRANSFER_STATE.FINAL_CHUNK_AVAILABLE
          ) {
            throw Error(`Unexpected transfer state ${current} while reading`);
          }
          const length = Atomics.load(control, 1);
          if (length < 0 || length > payload.byteLength)
            throw Error(
              `Invalid transfer data length ${length}; payload capacity ${payload.byteLength}`,
            );
          let decoded = decoder.next(payload.subarray(0, length));
          if (current === TRANSFER_STATE.CHUNK_AVAILABLE) {
            if (decoded.done)
              throw Error('Decoder completed before the final chunk');
            change(current, TRANSFER_STATE.READER_READY);
            waitForChange(TRANSFER_STATE.READER_READY);
            continue;
          }
          if (!decoded.done) decoded = decoder.next(undefined);
          if (!decoded.done)
            throw Error('Decoder did not finish after the final chunk');
          change(current, TRANSFER_STATE.FINAL_CHUNK_CONSUMED);
          waitForChange(TRANSFER_STATE.FINAL_CHUNK_CONSUMED);
          expect(TRANSFER_STATE.IDLE);
          return decoded.value;
        }
      } catch (error) {
        return abort(error);
      } finally {
        reading = false;
        prepared = false;
      }
    },
  });
};
harden(makeTransferClient);

/**
 * @param {SharedArrayBuffer} buffer
 * @param {{ check: () => void }} [lifecycle]
 */
export const makeTransferServer = (buffer, lifecycle) => {
  const protocol = makeTransferControl(buffer, lifecycle);
  const { control, payload, expect, change, waitForChange, abort } = protocol;
  let prepared = false;
  let writing = false;
  return Far('TransferServer', {
    /** @param {() => void} register */
    prepareToWrite(register) {
      try {
        if (prepared) throw Error('Transfer writer is already prepared');
        expect(TRANSFER_STATE.READER_READY);
        register();
        prepared = true;
        change(TRANSFER_STATE.READER_READY, TRANSFER_STATE.WRITER_READY);
      } catch (error) {
        prepared = false;
        abort(error);
      }
    },
    /** @param {Encoder} encoder */
    write(encoder) {
      try {
        if (!prepared)
          throw Error('Transfer writer must be prepared before write');
        if (writing) throw Error('Transfer writer is already writing');
        writing = true;
        expect(TRANSFER_STATE.WRITER_READY);
        const primed = encoder.next();
        if (primed.done || primed.value !== undefined)
          throw Error('Encoder must initially yield for a destination buffer');
        let next = encoder.next(payload);
        for (;;) {
          if (next.done && next.value === undefined)
            throw Error('Encoder must return a final byte chunk');
          const bytes = next.value === undefined ? payload : next.value;
          if (!(bytes instanceof Uint8Array))
            throw Error('Encoder chunk must be a Uint8Array');
          let offset = 0;
          do {
            const previous = Atomics.load(control, 0);
            if (
              previous !== TRANSFER_STATE.WRITER_READY &&
              previous !== TRANSFER_STATE.READER_READY
            ) {
              throw Error(
                `Unexpected transfer state ${previous} before writing`,
              );
            }
            const length = Math.min(
              bytes.byteLength - offset,
              payload.byteLength,
            );
            payload.set(bytes.subarray(offset, offset + length));
            offset += length;
            const final = Boolean(next.done && offset === bytes.byteLength);
            Atomics.store(control, 1, length);
            const published = final
              ? TRANSFER_STATE.FINAL_CHUNK_AVAILABLE
              : TRANSFER_STATE.CHUNK_AVAILABLE;
            change(previous, published);
            waitForChange(published);
            if (final) {
              expect(TRANSFER_STATE.FINAL_CHUNK_CONSUMED);
              Atomics.store(control, 1, 0);
              change(TRANSFER_STATE.FINAL_CHUNK_CONSUMED, TRANSFER_STATE.IDLE);
              return;
            }
            expect(TRANSFER_STATE.READER_READY);
          } while (offset < bytes.byteLength);
          // The consumer acknowledged the last yield before the encoder may
          // reuse the supplied buffer or publish another chunk.
          next = encoder.next(payload);
        }
      } catch (error) {
        abort(error);
      } finally {
        writing = false;
        prepared = false;
      }
    },
  });
};
