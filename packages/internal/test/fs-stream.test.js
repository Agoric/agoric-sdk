// @ts-check
import test from 'ava';
import { EventEmitter } from 'node:events';
import { open, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { waitUntilQuiescent } from '../src/lib-nodejs/waitUntilQuiescent.js';
import { makeFsStreamWriter } from '../src/node/fs-stream.js';

/** @import {FileHandle} from 'node:fs/promises' */

class FakeWriteStream extends EventEmitter {
  #destroyed = false;

  pending = false;

  get destroyed() {
    return this.#destroyed;
  }

  /**
   * @param {string | Uint8Array} _data
   * @param {(err?: Error | null) => void} cb
   * @returns {false}
   */
  write(_data, cb) {
    if (this.#destroyed) {
      cb(Error('Stream closed'));
      return false;
    }
    void Promise.resolve().then(() => cb(null));
    return false;
  }

  /** @param {(err?: Error | null) => void} [cb] */
  close(cb) {
    this.#destroyed = true;
    cb?.(null);
  }
}

const makeTestWriter = async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'fs-stream-test-'));
  const filePath = join(tempDir, 'output.log');

  const probeHandle = await open(filePath, 'a');
  const fileHandleProto = Object.getPrototypeOf(probeHandle);
  await probeHandle.close();

  /** @type {FakeWriteStream | undefined} */
  let stream;
  /** @type {FileHandle[]} */
  const openedHandles = [];
  const originalCreateWriteStream = fileHandleProto.createWriteStream;
  const cleanup = async () => {
    fileHandleProto.createWriteStream = originalCreateWriteStream;
    await Promise.allSettled(openedHandles.map(handle => handle.close()));
    await rm(tempDir, { recursive: true, force: true });
  };

  fileHandleProto.createWriteStream = function createWriteStream() {
    openedHandles.push(this);
    stream = new FakeWriteStream();
    return stream;
  };

  try {
    const writer = await makeFsStreamWriter(filePath);
    if (!writer || !stream) {
      throw Error('Expected makeFsStreamWriter to return a writer and stream');
    }
    return {
      stream,
      writer,
      cleanup,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
};

// These tests monkey-patch FileHandle.prototype.createWriteStream, so they must
// run serially even though makeFsStreamWriter itself does not require it.
test.serial(
  'makeFsStreamWriter reuses one drain waiter across concurrent writes',
  async t => {
    const { writer, stream, cleanup } = await makeTestWriter();
    const baselineErrorListeners = stream.listenerCount('error');

    try {
      const writes = Array.from({ length: 25 }, (_, i) =>
        writer.write(`chunk-${i}`),
      );

      await waitUntilQuiescent();

      t.is(stream.listenerCount('drain'), 1);
      t.is(stream.listenerCount('error'), baselineErrorListeners + 1);

      stream.emit('drain');
      await Promise.all(writes);

      t.is(stream.listenerCount('drain'), 0);
      t.is(stream.listenerCount('error'), baselineErrorListeners);

      const nextWrites = Array.from({ length: 12 }, (_, i) =>
        writer.write(`next-${i}`),
      );

      await waitUntilQuiescent();

      t.is(stream.listenerCount('drain'), 1);
      t.is(stream.listenerCount('error'), baselineErrorListeners + 1);

      stream.emit('drain');
      await Promise.all(nextWrites);
      await writer.close();
    } finally {
      await cleanup();
    }
  },
);

test.serial(
  'makeFsStreamWriter shares drain rejection across concurrent writes',
  async t => {
    const { writer, stream, cleanup } = await makeTestWriter();
    const baselineErrorListeners = stream.listenerCount('error');

    try {
      const writes = Array.from({ length: 12 }, () => writer.write('chunk'));

      await waitUntilQuiescent();

      t.is(stream.listenerCount('drain'), 1);
      t.is(stream.listenerCount('error'), baselineErrorListeners + 1);

      const boom = Error('boom');
      stream.emit('error', boom);

      const results = await Promise.allSettled(writes);
      t.true(
        results.every(
          result => result.status === 'rejected' && result.reason === boom,
        ),
      );

      t.is(stream.listenerCount('drain'), 0);
      t.is(stream.listenerCount('error'), baselineErrorListeners);
    } finally {
      await cleanup();
    }
  },
);
