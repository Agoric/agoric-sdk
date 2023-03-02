/* eslint-disable no-await-in-loop */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { buildVatController } from '@agoric/swingset-vat';
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
    defaultManagerType: 'local',
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
  const thing = await EV.vat('bootstrap').makeSimpleRemotable('Thing', {});
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
