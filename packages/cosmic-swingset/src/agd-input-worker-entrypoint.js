// @ts-check
import '@endo/init/unsafe-fast.js';
import fs from 'node:fs';
import { Socket } from 'node:net';
import { parentPort } from 'node:worker_threads';
import { makeReadlineLoop } from './helpers/read-fd-lines.js';
import { makeRpcInputHandler } from './helpers/rpc-input.js';

if (!parentPort) {
  throw Error(`Must be run as a worker thread`);
}
parentPort.on(
  'message',
  makeRpcInputHandler(parentPort, (fd, acceptLine, signal) => {
    // libuv polling lets shutdown cancel a pipe read while the peer stays open.
    const stat = fs.fstatSync(fd);
    const input =
      stat.isFIFO() || stat.isSocket()
        ? new Socket({ fd, readable: true, writable: false })
        : fs.createReadStream('<rpc-input>', { fd, autoClose: true });
    return makeReadlineLoop(input, acceptLine, signal);
  }),
);
