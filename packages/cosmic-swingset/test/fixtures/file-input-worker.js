import '@endo/init/unsafe-fast.js';
import fs from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import { makeReadlineLoop } from '../../src/helpers/read-fd-lines.js';
import { makeRpcInputHandler } from '../../src/helpers/rpc-input.js';

if (!parentPort) throw Error('File input fixture requires a worker');
// Keep open/close in the same worker. Closing an FD opened by another worker
// leaves that worker's automatic FD cleanup tracking stale after FD reuse.
parentPort.on(
  'message',
  makeRpcInputHandler(parentPort, (_fd, acceptLine, signal) => {
    const input = fs.createReadStream(workerData.inputPath);
    return makeReadlineLoop(input, acceptLine, signal);
  }),
);
