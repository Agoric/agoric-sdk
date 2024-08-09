// @ts-check
import '@endo/init/unsafe-fast.js';

import { parentPort } from 'worker_threads';
import { makeInputWorkerHandler } from './helpers/input-worker.js';

if (!parentPort) {
  throw Error(`Must be run as a worker thread`);
}
parentPort.on('message', makeInputWorkerHandler(parentPort));
