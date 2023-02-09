/* eslint-disable no-await-in-loop */
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { buildVatController } from '@agoric/swingset-vat';
import { kunser } from '@agoric/swingset-vat/src/lib/kmarshal.js';

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

test('upgrade vat-board', async t => {
  const { bfile } = t.context;

  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType:
      /** @type {import('@agoric/swingset-vat/src/types-external.js').ManagerType} */ (
        'xs-worker'
      ), // 'local',
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: bfile('../../../SwingSet/test/bootstrap-relay.js'),
      },
    },
    bundles: {
      board: { sourceSpec: bfile('../../src/vat-board.js') },
    },
  };

  const c = await buildVatController(config);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    if (status === 'fulfilled') {
      const result = c.kpResolution(kpid);
      return kunser(result);
    }
    assert(status === 'rejected');
    const err = c.kpResolution(kpid);
    throw kunser(err);
  };
  const messageVat = (name, methodName, args) =>
    run('messageVat', [{ name, methodName, args }]);
  const messageObject = (presence, methodName, args) =>
    run('messageVatObject', [{ presence, methodName, args }]);

  t.log('create initial version');
  const boardVatConfig = {
    name: 'board',
    bundleCapName: 'board',
  };
  await run('createVat', [boardVatConfig]);
  const board = await messageVat('board', 'getBoard', []);
  const thing = await run('makeSimpleRemotable', ['Thing', {}]);
  const thingId = await messageObject(board, 'getId', [thing]);
  t.regex(thingId, /^board0[0-9]+$/);

  t.log('now perform the null upgrade');
  const { incarnationNumber } = await run('upgradeVat', [boardVatConfig]);
  t.is(incarnationNumber, 2, 'Board vat must be upgraded');
  const board2 = await messageVat('board', 'getBoard', []);
  t.is(board2, board, 'must get the same board reference');
  const actualThing = await messageObject(board2, 'getValue', [thingId]);
  t.is(actualThing, thing, 'must get original value back');
});
