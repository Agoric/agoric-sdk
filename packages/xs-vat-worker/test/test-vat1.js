import { test } from 'tape-promise/tape';

import { main } from './kernelSimulator';

const resolve = p => require.resolve(p);

test('replay simple transcript with node vatWorker', async t => {
  process.env.WORKERBIN = resolve('../bin/node-vat-worker');
  process.env.VAT1 = resolve('./vat-target.js');
  process.env.TRANSCRIPT = resolve('./transcript.txt');

  process.chdir(resolve('..')); // so node-vat-worker can find stuff in src/
  await main(process.argv, {
    env: process.env,
    // eslint-disable-next-line global-require
    io: {
      // eslint-disable-next-line global-require
      readFile: require('fs').promises.readFile,
    },
    // eslint-disable-next-line global-require
    bundleSource: require('@agoric/bundle-source').default,
    // eslint-disable-next-line global-require
    spawn: require('child_process').spawn,
  });

  t.ok('did not crash');
  t.end();
});
