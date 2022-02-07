/* global process */
// @ts-check
import '@endo/init/pre-bundle-source.js';
import 'node-lmdb';
import '@endo/init';

import { parse, stringify } from '@endo/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import '@agoric/cosmic-swingset/src/anylogger-agoric.js';
import { connectToFakeChain } from '@agoric/cosmic-swingset/src/sim-chain.js';

// console.error('getting pipe entrypoing started');
const [method, ...margs] = process.argv.slice(2);

const { send: psend } = process;
assert(psend);
const send = (...args) => psend.apply(process, args);

process.on('SIGINT', () => {
  // console.log('exiting pipe child');
  process.exit(99);
});

const main = async () => {
  let baton = makePromiseKit();
  let deliverator;
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
          baton = makePromiseKit();
          return baton.promise;
        },
      );
      break;
    }
    default:
  }

  process.on('message', async msg => {
    if (msg === 'go') {
      baton.resolve(undefined);
      return;
    }
    const as = parse(`${msg}`);
    deliverator(...as).then(() => send('go'));
  });

  send('go');
};

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
