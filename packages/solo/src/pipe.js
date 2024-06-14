// @ts-check
import { fork } from 'child_process';
import path from 'path';

import { makePromiseKit } from '@endo/promise-kit';
import { parse, stringify } from '@endo/marshal';

import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

export const connectToPipe = async ({ method, args, deliverInboundToMbx }) => {
  // console.log('connectToPipe', method, args);

  const { registerShutdown } = makeShutdown();
  const cp = fork(path.join(dirname, 'pipe-entrypoint.js'), [method, ...args], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  });
  registerShutdown(() => {
    // console.log('connectToPipe', 'shutdown');
    cp.kill('SIGTERM');
  });
  // console.log('connectToPipe', 'done fork');

  let mutex = makePromiseKit();
  cp.on('message', msg => {
    // console.log('connectToPipe', 'received', msg);
    if (msg === 'go') {
      mutex.resolve(undefined);
      return;
    }
    // console.log('pipe.js', msg);
    /** @type {any} */
    const as = parse(`${msg}`);
    deliverInboundToMbx(...as).then(() => cp.send('go'));
  });

  await mutex.promise;

  return async (...as) => {
    // console.log('sending from pipe.js', as);
    mutex = makePromiseKit();
    cp.send(stringify(harden(as)));
    return mutex.promise;
  };
};
