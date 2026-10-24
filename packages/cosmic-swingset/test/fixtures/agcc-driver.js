import '@endo/init/debug.js';
import fs from 'node:fs';
import process from 'node:process';
import { Worker } from 'node:worker_threads';
import { makeAgcc } from '../../src/agcc-agvm.js';

const bridge = makeAgcc(4, 5, {
  write: (fd, text) => {
    fs.writeSync(fd, text);
  },
  makeInputWorker: () =>
    new Worker(new URL('../../src/agd-input-worker.js', import.meta.url)),
  makeMonitor: () =>
    new Worker(new URL('../../src/rpc-monitor-worker.js', import.meta.url)),
  onFinish: () => process.exit(0),
  onError: error => {
    fs.writeSync(2, String(error));
    process.exit(1);
  },
});
const sender = bridge.start(
  (port, messageJSON, replier) => {
    if (port !== 1) throw Error(`unexpected node port ${port}`);
    const message = JSON.parse(messageJSON);
    switch (message.type) {
      case 'call':
        replier.resolve(sender.send(7, message.data));
        break;
      case 'direct-call':
        replier.resolve(
          sender.send(7, message.data, {
            handleError: error => {
              throw Error(error);
            },
          }),
        );
        break;
      case 'custom-error':
        replier.resolve(
          sender.send(7, message.data, {
            handleError: error => `handled: ${error}`,
          }),
        );
        break;
      case 'resolve-twice':
        replier.resolve('first');
        replier.resolve('second');
        replier.reject('ignored');
        break;
      case 'reject':
        replier.reject('declined');
        break;
      case 'notify':
        replier.reject('ignored notification');
        break;
      case 'exit':
        process.exit(0);
        break;
      default:
        throw Error(`unsupported test message ${message.type}`);
    }
  },
  ['agcc-test-driver'],
);
