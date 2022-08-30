// @ts-check

import '@endo/init/debug.js';
import anyTest from 'ava';
import { E } from '@endo/far';
import {
  makeSwingsetController,
  buildKernelBundles,
  initializeSwingset,
  buildBridge,
} from '@agoric/swingset-vat';
import { provideHostStorage } from '@agoric/swingset-vat/src/controller/hostStorage.js';

/** @type {import('ava').TestFn<{ data: { kernelBundles: any, config: any } }>} */
const test = anyTest;

test.before(async t => {});

const log = label => x => {
  console.log(label, x);
  return x;
};

const bfile = name => log('url')(new URL(name, import.meta.url).pathname);

test('run swingset', async t => {
  const bd = buildBridge((bridgeId, message) => {
    console.log('callOutbound', bridgeId);
  });

  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('./bootstrap.js') },
      chainStorage: { sourceSpec: bfile('../../../src/vat-chainStorage.js') },
    },
    devices: {
      bridge: {
        sourceSpec: new URL(bd.srcPath, import.meta.url).pathname,
      },
    },
  };

  const hostStorage = provideHostStorage();
  const deviceEndowments = { bridge: bd.endowments };
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  t.teardown(c.shutdown);

  await c.run(); // allow timer device/vat messages to settle
  t.pass();
});
