import '@agoric/install-ses';
import test from 'ava';
import { initSwingStore } from '@agoric/swing-store-simple';

import { buildVatController } from '../../src/index';
import { buildBridge } from '../../src/devices/bridge';
import { buildPlugin } from '../../src/devices/plugin';

test.before('initialize hostStorage', t => {
  const { storage } = initSwingStore(null);
  t.context.hostStorage = storage;
});

const setupVatController = async t => {
  const inputQueue = [];
  const queueThunkForKernel = async thunk => {
    inputQueue.push(thunk);
  };

  const pluginRequire = mod => {
    t.is(mod, 'pingpong');
    // eslint-disable-next-line global-require
    return require('./pingpong');
  };
  const plugin = buildPlugin(__dirname, pluginRequire, queueThunkForKernel);
  const bridge = buildBridge();
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: require.resolve('./bootstrap'),
      },
      bridge: {
        sourceSpec: require.resolve('./vat-bridge'),
      },
    },
    devices: [
      ['plugin', plugin.srcPath, plugin.endowments],
      ['bridge', bridge.srcPath, bridge.endowments],
    ],
  };
  const c = await buildVatController(config, ['plugin'], {
    hostStorage: t.context.hostStorage,
  });
  const cycle = async () => {
    await c.run();
    while (inputQueue.length) {
      inputQueue.shift()();
      // eslint-disable-next-line no-await-in-loop
      await c.run();
    }
  };
  return { bridge, cycle, dump: c.dump, plugin, queueThunkForKernel };
};

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
  const {
    bridge,
    cycle,
    dump,
    plugin,
    queueThunkForKernel,
  } = await setupVatController(t);

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
