import '@endo/init/debug.js';
import { parentPort } from 'node:worker_threads';
import {
  makeTransferServer,
  makeTextEncoder,
  partitionTransferBuffer,
  TRANSFER_STATE,
} from '../../src/helpers/sync-xfer.js';

if (!parentPort) throw Error('Transfer fixture requires a worker');
const port = parentPort;
let reusableServer;
port.on('message', ({ buf, chunks, mode, gate, length, reuse }) => {
  try {
    if (mode === 'readiness-notify') {
      const { control, payload } = partitionTransferBuffer(buf);
      const phase = new Int32Array(gate);
      const oldReply = new TextEncoder().encode(
        '{"id":16518,"result":"old","error":null}',
      );
      payload.set(oldReply);
      Atomics.store(control, 1, oldReply.length);
      Atomics.store(control, 0, TRANSFER_STATE.WRITER_READY);
      Atomics.store(phase, 0, 1);
      Atomics.notify(phase, 0);
      while (Atomics.load(phase, 0) === 1) Atomics.wait(phase, 0, 1);
      // Each successful notify requires the reader to park again without any
      // state transition. A one-shot wait would consume the old reply here.
      for (let i = 0; i < 3; i += 1) {
        while (Atomics.notify(control, 0) === 0) {
          if (Atomics.load(control, 0) === TRANSFER_STATE.ABORTED)
            throw Error('Reader aborted');
          Atomics.wait(phase, 0, 2, 1);
        }
      }
      const reply = new TextEncoder().encode(
        '{"id":16519,"result":"new","error":null}',
      );
      payload.set(reply);
      Atomics.store(control, 1, reply.length);
      Atomics.store(control, 0, TRANSFER_STATE.FINAL_CHUNK_AVAILABLE);
      Atomics.notify(control, 0);
      while (Atomics.load(control, 0) === TRANSFER_STATE.FINAL_CHUNK_AVAILABLE)
        Atomics.wait(control, 0, TRANSFER_STATE.FINAL_CHUNK_AVAILABLE);
      Atomics.store(control, 1, 0);
      Atomics.store(control, 0, TRANSFER_STATE.IDLE);
      Atomics.notify(control, 0);
    } else {
      const server = reuse
        ? (reusableServer ||= makeTransferServer(buf))
        : makeTransferServer(buf);
      server.prepareToWrite(() => {});
      if (mode === 'bad-length') {
        const { control } = partitionTransferBuffer(buf);
        Atomics.store(control, 1, length);
        Atomics.store(control, 0, TRANSFER_STATE.FINAL_CHUNK_AVAILABLE);
        Atomics.notify(control, 0);
      } else if (mode === 'bad-state') {
        const { control } = partitionTransferBuffer(buf);
        Atomics.store(control, 0, 99);
        Atomics.notify(control, 0);
      } else if (mode === 'reentrant-writer') {
        function* recursiveEncoder() {
          yield;
          server.write(makeTextEncoder('nested'));
          return new Uint8Array(0);
        }
        server.write(recursiveEncoder());
      } else if (mode?.startsWith('bad-encoder')) {
        function* brokenEncoder() {
          if (mode === 'bad-encoder-prime') return new Uint8Array(0);
          yield;
          if (mode === 'bad-encoder-chunk') yield 17;
          return undefined;
        }
        Reflect.apply(server.write, undefined, [brokenEncoder()]);
      } else {
        function* encode() {
          let destination = yield;
          for (const chunk of chunks.slice(0, -1)) {
            if (mode === 'in-place') {
              destination.set(chunk);
              destination = yield chunk.length === destination.length
                ? undefined
                : destination.subarray(0, chunk.length);
            } else yield chunk;
          }
          const last = chunks.at(-1) || new Uint8Array(0);
          if (mode === 'in-place') {
            destination.set(last);
            return destination.subarray(0, last.length);
          }
          return last;
        }
        server.write(encode());
      }
    }
    port.postMessage('written');
  } catch (error) {
    port.postMessage({ error: String(error) });
  }
});
