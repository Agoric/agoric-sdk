/* global process */
// @ts-check
import '@endo/init/pre-bundle-source.js';
import '@endo/init/unsafe-fast.js';

import { parse, stringify } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

import '@agoric/cosmic-swingset/src/anylogger-agoric.js';
import { connectToFakeChain } from '@agoric/cosmic-swingset/src/sim-chain.js';
import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';

const { registerShutdown } = makeShutdown(false);
registerShutdown(() => process.exit());

// console.error('getting pipe entrypoing started');
const [method, ...margs] = process.argv.slice(2);

const { send: psend } = process;
assert(psend);
const send = (...args) => psend.apply(process, args);

const main = async () => {
  let mutex = makePromiseKit();
  let deliverator;

  process.on('message', async msg => {
    if (msg === 'go') {
      mutex.resolve(undefined);
      return;
    }
    const as = parse(`${msg}`);
    deliverator(...as).then(() => send('go'));
  });

  await null;
  switch (method) {
    case 'connectToFakeChain': {
      const [basedir, GCI, delay] = margs;
      deliverator = await connectToFakeChain(
        basedir,
        GCI,
        Number(delay),
        async (...args) => {
          // console.log('sending', args);
          send(stringify(harden(args)));
          mutex = makePromiseKit();
          return mutex.promise;
        },
      );
      break;
    }
    default: {
      assert.error(`unknown method ${method}`);
    }
  }

  // Notify our caller that we're ready.
  send('go');
};

process.exitCode = 1;
main().then(
  () => {
    process.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    process.exit(process.exitCode || 1);
  },
);
