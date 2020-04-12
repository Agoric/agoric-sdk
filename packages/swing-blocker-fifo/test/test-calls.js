import { Worker } from 'worker_threads';
import { test } from 'tape-promise/tape';
import { registerBlocker, getBlockerFromMeta } from '@agoric/swing-blocker';
import { makeFifo, register as registerFifo } from '../fifoSwingBlocker.js';

registerFifo(registerBlocker);

test('wake fifo and return', async t => {
  // NOTE: We have to use CommonJS for compatibility.
  const worker = new Worker(`${__dirname}/wake-worker-cjs.js`);
  try {
    let pollCount = 0;
    const fifo = await makeFifo();
    process.on('exit', fifo.cleanup);
    t.deepEquals(
      JSON.parse(JSON.stringify(fifo.meta)),
      fifo.meta,
      `fifo meta is serialisable`,
    );
    const blocker = getBlockerFromMeta(fifo.meta, () => {
      pollCount += 1;
      if (pollCount > 1) {
        return 123;
      }
      return undefined;
    });

    await new Promise((resolve, reject) => {
      worker.addListener('message', value => {
        t.equals(value, 'waiting', `worker is waiting`);
        resolve();
      });
      worker.addListener('error', value => {
        reject(value);
      });
      worker.postMessage([2000, fifo.meta]);
    });

    // Wait until the worker returns.
    t.assert(true, 'continuing execution');
    t.equals(blocker(), 123, 'got blocker results');
    t.equals(pollCount, 2, 'pollCount is 2');
    t.equals(blocker(), 123, 'next blocker immediate');
    t.equals(pollCount, 3, 'pollCount is 3');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    if (worker) {
      worker.terminate();
    }
    t.end();
  }
});
