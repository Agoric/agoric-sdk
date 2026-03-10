// @ts-nocheck
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';

import {
  swingsetIsInitialized,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import { buildBridge } from '../../src/devices/bridge/bridge.js';
import { buildPlugin } from '../../src/devices/plugin/plugin.js';

async function setupVatController(t, kernelStorage) {
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

  if (!swingsetIsInitialized(kernelStorage)) {
    const config = {
      bootstrap: 'bootstrap',
      vats: {
        bootstrap: {
          sourceSpec: new URL('bootstrap.js', import.meta.url).pathname,
          // Replay-sensitive test: avoid GC-driven BOYD nondeterminism.
          reapInterval: 'never',
        },
        bridge: {
          sourceSpec: new URL('vat-bridge.js', import.meta.url).pathname,
          // Replay-sensitive test: avoid GC-driven BOYD nondeterminism.
          reapInterval: 'never',
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
    await initializeSwingset(config, ['plugin'], kernelStorage);
  }
  const c = await makeSwingsetController(kernelStorage, deviceEndowments);
  t.teardown(c.shutdown);
  const cycle = async () => {
    await c.run();
    while (inputQueue.length) {
      inputQueue.shift()();
      await c.run();
    }
  };
  return { bridge, cycle, dump: c.dump, plugin, queueThunkForKernel };
}

test('plugin first time', async t => {
  const kernelStorage = initSwingStore().kernelStorage;
  const { bridge, cycle, dump, queueThunkForKernel } = await setupVatController(
    t,
    kernelStorage,
  );

  void queueThunkForKernel(() => bridge.deliverInbound('pingpong'));
  await cycle();

  t.deepEqual(dump().log, [
    'starting plugin test',
    'installing pingPongP',
    'starting pingpong test',
    'pingpong reply = Whoopie Agoric!',
  ]);
});

test('plugin after restart', async t => {
  const kernelStorage = initSwingStore().kernelStorage;

  const {
    bridge: bridge1,
    cycle: cycle1,
    queueThunkForKernel: queue1,
  } = await setupVatController(t, kernelStorage);
  void queue1(() => bridge1.deliverInbound('pingpong'));
  await cycle1();

  const { bridge, cycle, dump, plugin, queueThunkForKernel } =
    await setupVatController(t, kernelStorage);
  plugin.reset();
  void queueThunkForKernel(() => bridge.deliverInbound('pingpong'));
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
