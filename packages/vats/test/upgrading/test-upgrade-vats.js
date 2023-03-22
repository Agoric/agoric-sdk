/* eslint-disable no-await-in-loop */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { buildVatController } from '@agoric/swingset-vat';
import { BridgeId } from '@agoric/internal';
import { makeRunUtils } from '../bootstrapTests/supports.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const makeTestContext = async metaUrl => {
  const bfile = name => new URL(name, metaUrl).pathname;

  return { bfile };
};

/**
 * NOTE: limit ambient authority such as import.meta.url
 * to test.before()
 */
test.before(async t => {
  t.context = await makeTestContext(import.meta.url);
});

/**
 * @param {any} t
 * @param {Partial<SwingSetConfig>} [kernelConfigOverrides]
 * @param {Record<string, unknown>} [deviceEndowments]
 * @returns {ReturnType<typeof makeRunUtils>}
 */
const makeScenario = async (
  t,
  kernelConfigOverrides = {},
  deviceEndowments,
) => {
  const { bfile } = t.context;

  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: bfile('../../../SwingSet/test/bootstrap-relay.js'),
      },
    },
    bundleCachePath: 'bundles',
    ...kernelConfigOverrides,
  };

  const c = await buildVatController(
    config,
    undefined,
    undefined,
    deviceEndowments,
  );
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  const runUtils = makeRunUtils(c, t.log);
  return runUtils;
};

test('upgrade vat-board', async t => {
  const { bfile } = t.context;
  const bundles = {
    board: {
      sourceSpec: bfile('../../src/vat-board.js'),
    },
  };

  const { EV } = await makeScenario(t, { bundles });

  t.log('create initial version');
  const boardVatConfig = {
    name: 'board',
    bundleCapName: 'board',
  };
  await EV.vat('bootstrap').createVat(boardVatConfig);
  const board = await EV.vat('board').getBoard();
  const thing = await EV.rawBoot.makeRemotable('Thing', {});
  const thingId = await EV(board).getId(thing);
  t.regex(thingId, /^board0[0-9]+$/);

  t.log('now perform the null upgrade');
  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    boardVatConfig,
  );
  t.is(incarnationNumber, 2, 'Board vat must be upgraded');
  const board2 = await EV.vat('board').getBoard();
  t.is(board2, board, 'must get the same board reference');
  const actualThing = await EV(board2).getValue(thingId);
  t.is(actualThing, thing, 'must get original value back');
});

test.skip('upgrade bootstrap vat', async t => {
  const { bfile } = t.context;
  const bundles = {
    chain: { sourceSpec: bfile('../src/core/boot-chain.js') },
  };
  const { EV } = await makeScenario(t, bundles);

  t.log('create initial version');
  const chainVatConfig = {
    name: 'chain',
    bundleCapName: 'chain',
  };
  await EV.vat('bootstrap').createVat(chainVatConfig);
  await EV.vat('chain')
    .bootstrap({}, {})
    .catch(problem => t.log('TODO: address problem:', problem));

  t.log('now perform the null upgrade');

  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    chainVatConfig,
  );
  t.is(incarnationNumber, 2, 'vat must be upgraded');
});

test('upgrade vat-bridge', async t => {
  const { bfile } = t.context;
  const bundles = {
    bridge: { sourceSpec: bfile('../../src/vat-bridge.js') },
  };
  const devices = {
    bridge: { sourceSpec: bfile('./device-bridge.js') },
  };

  const callOutbound = (srcID, obj) => {
    t.log(`callOutbound(${srcID}, ${obj})`);
    return obj;
  };

  const { EV } = await makeScenario(
    t,
    { bundles, devices },
    {
      bridge: {
        t,
        callOutbound,
        expectedStorageValues: ['abc', 'def'],
      },
    },
  );

  t.log('create initial version');
  const bridgeVatConfig = {
    name: 'bridge',
    bundleCapName: 'bridge',
  };
  await EV.vat('bootstrap').createVat(bridgeVatConfig);

  await t.throwsAsync(
    () => EV.vat('bridge').provideManagerForBridge(1),
    {
      message: /must be given a device node/,
    },
    'rejects non-device node',
  );

  const dev = await EV.vat('bootstrap').getDevice('bridge');
  const bridge1 = await EV.vat('bridge').provideManagerForBridge(dev);
  const bridge2 = await EV.vat('bridge').provideManagerForBridge(dev);
  t.is(bridge1, bridge2, 'must get the same bridge reference');

  const storageBridge = await EV(bridge1).register(BridgeId.STORAGE);
  const storageRoot = await EV.vat('bridge').makeBridgedChainStorageRoot(
    storageBridge,
    'root1',
    { sequence: false },
  );
  const path1 = await EV(storageRoot).getPath();
  t.is(path1, 'root1', 'must get the same path back');

  const ret = await EV(storageRoot).setValue('abc');
  t.is(ret, undefined, 'setValue must return undefined');

  await t.throwsAsync(() => EV(storageBridge).fromBridge('no handler'), {
    message: /No inbound handler for/,
  });

  const storageHandler = await EV.rawBoot.makeRemotable(
    'loggingStorageHandler',
    {
      fromBridge: undefined,
    },
  );
  await EV(storageBridge).setHandler(storageHandler);
  t.deepEqual(
    await EV.rawBoot.getLogForRemotable(storageHandler),
    [],
    'log must start empty',
  );
  await EV(storageBridge).fromBridge('storage handler is good');
  t.deepEqual(
    await EV.rawBoot.getLogForRemotable(storageHandler),
    [['fromBridge', 'storage handler is good']],
    'log must show one handler call',
  );

  t.log('now perform the null upgrade');
  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    bridgeVatConfig,
  );

  t.is(incarnationNumber, 2, 'Bridge vat must be upgraded');

  const path1b = await EV(storageRoot).getPath();
  t.is(path1b, 'root1', 'must get the same path back');

  const bridge1b = await EV.vat('bridge').provideManagerForBridge(dev);
  t.is(bridge1b, bridge1, 'must get the same bridge reference');

  const ret2 = await EV(storageRoot).setValue('def');
  t.is(ret2, undefined, 'setValue must return undefined');

  await EV(storageBridge).fromBridge('storage handler is still good');
  t.deepEqual(
    await EV.rawBoot.getLogForRemotable(storageHandler),
    [
      ['fromBridge', 'storage handler is good'],
      ['fromBridge', 'storage handler is still good'],
    ],
    'log must show next handler call',
  );
});
