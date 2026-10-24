import '@endo/init/unsafe-fast.js';
import process from 'node:process';
import { parentPort, workerData } from 'node:worker_threads';

if (!parentPort) throw Error('Fault fixture requires a worker');
const port = parentPort;
if (workerData === 'reader-early-exit' || workerData === 'monitor-early-exit')
  process.exit(17);
if (workerData === 'monitor-exit') {
  await import('../../src/rpc-monitor-worker.js');
  parentPort.on('message', () => {
    process.exit(17);
  });
} else {
  await import('../../src/agd-input-worker.js');
  parentPort.on('message', message => {
    if (
      workerData === 'unknown-parent-message' &&
      message.type === 'INIT_LOOP'
    ) {
      port.postMessage({ type: 'NOT_A_MESSAGE' });
      return;
    }
    if (message.type !== 'INTERCEPT_ID') return;
    if (workerData === 'reader-error') throw Error('reader crash');
    if (workerData === 'reader-partial-exit') {
      // Inject death after delivering one non-final transfer fragment. The
      // receiver must fail instead of waiting forever for the missing suffix.
      const control = new Int32Array(message.buf, 0, 2);
      const payload = new Uint8Array(message.buf, 8);
      const prefix = new TextEncoder().encode('{"id":1,"result":"');
      payload.set(prefix);
      Atomics.store(control, 1, prefix.length);
      Atomics.store(control, 0, 3); // TRANSFER_READ_PARTIAL
      Atomics.notify(control, 0);
      Atomics.wait(control, 0, 3);
    }
    process.exit(17);
  });
}
