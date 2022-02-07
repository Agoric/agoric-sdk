// @ts-check
import { fork } from 'child_process';
import path from 'path';

import { makePromiseKit } from '@agoric/promise-kit';
import { parse, stringify } from '@endo/marshal';

import { makeShutdown } from '@agoric/cosmic-swingset/src/shutdown.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

export const connectToPipe = async ({ method, args, deliverInboundToMbx }) => {
  // console.log('connectToPipe', method, args);

  const cp = fork(path.join(dirname, 'pipe-entrypoint.js'), [method, ...args], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  });
  // console.log('connectToPipe', 'done fork');

  let baton = makePromiseKit();
  cp.on('message', msg => {
    // console.log('connectToPipe', 'received', msg);
    if (msg === 'go') {
      baton.resolve(undefined);
      return;
    }
    // console.log('pipe.js', msg);
    const as = parse(`${msg}`);
    deliverInboundToMbx(...as).then(() => cp.send('go'));
  });

  const { registerShutdown } = makeShutdown();
  registerShutdown(() => {
    // console.log('connectToPipe', 'shutdown');
    cp.kill('SIGINT');
  });

  await baton.promise;
  return async (...as) => {
    // console.log('sending from pipe.js', as);
    baton = makePromiseKit();
    cp.send(stringify(harden(as)));
    return baton.promise;
  };
};
