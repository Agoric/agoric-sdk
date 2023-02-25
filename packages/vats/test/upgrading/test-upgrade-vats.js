/* eslint-disable no-await-in-loop */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { buildVatController } from '@agoric/swingset-vat';
import { makeRunUtils } from '../bootstrapTests/supports.js';

const resolveAssetModule = specifier =>
  new URL(specifier, import.meta.url).pathname;
const bundleSpecs = {
  relay: {
    // XXX cross-package asset module
    sourceSpec: resolveAssetModule('../../../SwingSet/test/bootstrap-relay.js'),
  },
  board: { sourceSpec: resolveAssetModule('../../src/vat-board.js') },
  chain: { sourceSpec: resolveAssetModule('../../src/core/boot-chain.js') },
};

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const makeTestContext = async () => {
  return {};
};

/**
 * NOTE: limit ambient authority such as import.meta.url
 * to test.before()
 */
test.before(async t => {
  t.context = await makeTestContext(import.meta.url);
});

const makeScenario = async (t, bundles) => {
  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: bundleSpecs.relay,
    },
    bundles,
  };

  const c = await buildVatController(config);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  const runUtils = makeRunUtils(c, t.log);

  return runUtils;
};

test('upgrade vat-board', async t => {
  const bundles = {
    board: bundleSpecs.board,
  };

  const { EV } = await makeScenario(t, bundles);

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
  const bundles = {
    chain: bundleSpecs.chain,
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
