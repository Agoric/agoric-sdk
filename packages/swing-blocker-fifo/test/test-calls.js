import { Worker } from 'worker_threads';
import { test } from 'tape-promise/tape';
import {
  RETRY_POLL,
  registerBlocker,
  getBlockerWithPoll,
} from '@agoric/swing-blocker';
import { makeFifo, register as registerFifo } from '../fifoSwingBlocker.js';

registerFifo(registerBlocker);

test('wake fifo and return', async t => {
  // NOTE: We have to use CommonJS for compatibility.
  const worker = new Worker(`${__dirname}/wake-worker-cjs.js`);
  try {
    let pollCount = 0;
    const [fifoSpec, cleanup] = await makeFifo();
    process.on('exit', cleanup);
    t.deepEquals(
      JSON.parse(JSON.stringify(fifoSpec)),
      fifoSpec,
      `fifoSpec is serialisable`,
    );
    const blocker = getBlockerWithPoll(fifoSpec, (n, mult = 1) => {
      pollCount += 1;
      if (pollCount > 1) {
        return 123 + n * mult;
      }
      return RETRY_POLL;
    });

    await new Promise((resolve, reject) => {
      worker.addListener('message', value => {
        t.equals(value, 'waiting', `worker is waiting`);
        resolve();
      });
      worker.addListener('error', value => {
        reject(value);
      });
      worker.postMessage([2000, fifoSpec]);
    });

    // Wait until the worker returns.
    t.assert(true, 'continuing execution');
    let doneBlocking = false;
    const pr = Promise.resolve().then(_ =>
      t.equals(doneBlocking, true, `Promise only resolved after blocking`),
    );

    t.equals(blocker(2), 125, 'got blocker results');
    doneBlocking = true;
    await pr;

    t.equals(pollCount, 2, 'pollCount is 2');
    t.equals(blocker(3, 4), 135, 'next blocker immediate');
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
