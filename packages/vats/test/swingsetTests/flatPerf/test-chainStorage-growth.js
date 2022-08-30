// @ts-check

import '@endo/init/debug.js';
import anyTest from 'ava';
import {
  makeSwingsetController,
  initializeSwingset,
  buildBridge,
  buildKernelBundles,
} from '@agoric/swingset-vat';
import { provideHostStorage } from '@agoric/swingset-vat/src/controller/hostStorage.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const makeTestContext = async () => {
  const kernelBundles = await buildKernelBundles();
  /** @type {number[]} */
  const times = [];
  return { kernelBundles, start: 0, times };
};

test.before(async t => {
  t.context = await makeTestContext();
});

const log = label => x => {
  console.log(label, x);
  return x;
};

const asset = name => new URL(name, import.meta.url).pathname;

const makeControllerWithBridge = async (t, bd, vats) => {
  /** @type {SwingSetConfig} */
  const config = {
    bootstrap: 'bootstrap',
    vats,
    devices: {
      bridge: {
        sourceSpec: new URL(bd.srcPath, import.meta.url).pathname,
      },
    },
    defaultManagerType: 'xs-worker',
  };

  const hostStorage = provideHostStorage();
  const deviceEndowments = { bridge: bd.endowments };
  const { kernelBundles } = t.context;
  await initializeSwingset(config, [], hostStorage, { kernelBundles });
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  return c;
};

const test1 = async ix => {
  test(`chainStorage ${ix}: send large strings from bootstrap`, async t => {
    const bd = buildBridge((bridgeId, { key, method, value }) => {
      assert.typeof(value, 'string');
      //   t.log('callOutbound', bridgeId, key, value.length);
    });

    const vats = {
      bootstrap: { sourceSpec: asset('./bootstrap.js') },
      chainStorage: { sourceSpec: asset('../../../src/vat-chainStorage.js') },
    };
    const c = await makeControllerWithBridge(t, bd, vats);
    t.teardown(c.shutdown);

    await c.run();
    t.pass();
  });
};

test.beforeEach(t => {
  const start = new Date();
  t.context.start = start.getTime();
});

test.afterEach(t => {
  const { start } = t.context;
  const end = new Date();
  const dur = end.getTime() - start;
  t.context.times.push(dur);
});

const logCSV = times => {
  times.forEach((dur, ix) => console.info(`${ix},${dur}`));
};

test.after(t => {
  logCSV(t.context.times);
});

for (let ix = 0; ix < 32; ix += 1) {
  test1(ix);
}
