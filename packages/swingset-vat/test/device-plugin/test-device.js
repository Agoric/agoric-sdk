import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { provideHostStorage } from '../../src/hostStorage.js';

import {
  swingsetIsInitialized,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import { buildBridge } from '../../src/devices/bridge.js';
import { buildPlugin } from '../../src/devices/plugin.js';

test.before('initialize storage', t => {
  t.context.hostStorage = provideHostStorage();
});

async function setupVatController(t) {
  const inputQueue = [];
  const queueThunkForKernel = async thunk => {
    inputQueue.push(thunk);
  };

  const importPlugin = mod => {
    t.is(mod, 'pingpong');
    return import('./pingpong.js');
  };
  const plugin = buildPlugin(
    new URL('./', import.meta.url).pathname,
    importPlugin,
    queueThunkForKernel,
  );
  const bridge = buildBridge();
  const deviceEndowments = {
    plugin: { ...plugin.endowments },
    bridge: { ...bridge.endowments },
  };

  if (!swingsetIsInitialized(t.context.hostStorage)) {
    const config = {
      bootstrap: 'bootstrap',
      vats: {
        bootstrap: {
          sourceSpec: new URL('bootstrap.js', import.meta.url).pathname,
        },
        bridge: {
          sourceSpec: new URL('vat-bridge.js', import.meta.url).pathname,
        },
      },
      devices: {
        plugin: {
          sourceSpec: plugin.srcPath,
        },
        bridge: {
          sourceSpec: bridge.srcPath,
        },
      },
    };
    await initializeSwingset(config, ['plugin'], t.context.hostStorage);
  }
  const c = await makeSwingsetController(
    t.context.hostStorage,
    deviceEndowments,
  );
  const cycle = async () => {
    await c.run();
    while (inputQueue.length) {
      inputQueue.shift()();
      // eslint-disable-next-line no-await-in-loop
      await c.run();
    }
  };
  return { bridge, cycle, dump: c.dump, plugin, queueThunkForKernel };
}

test.serial('plugin first time', async t => {
  const { bridge, cycle, dump, queueThunkForKernel } = await setupVatController(
    t,
  );

  queueThunkForKernel(() => bridge.deliverInbound('pingpong'));
  await cycle();

  t.deepEqual(dump().log, [
    'starting plugin test',
    'installing pingPongP',
    'starting pingpong test',
    'pingpong reply = Whoopie Agoric!',
  ]);
});

test.serial('plugin after restart', async t => {
  const { bridge, cycle, dump, plugin, queueThunkForKernel } =
    await setupVatController(t);

  plugin.reset();
  queueThunkForKernel(() => bridge.deliverInbound('pingpong'));
  await cycle();

  t.deepEqual(dump().log, [
    'starting plugin test',
    'installing pingPongP',
    'starting pingpong test',
    'pingpong reply = Whoopie Agoric!',
    'starting pingpong test',
    'pingpong reply = Whoopie Agoric!',
  ]);
});
