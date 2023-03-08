import '@agoric/swingset-vat/tools/prepare-test-env.js';
import test from 'ava';
import { buildVatController } from '@agoric/swingset-vat';
import { kunser } from '@agoric/swingset-vat/src/lib/kmarshal.js';

const bfile = name => new URL(name, import.meta.url).pathname;

test('local promises are rejected by vat upgrade', async t => {
  // TODO: Generalize packages/SwingSet/test/upgrade/test-upgrade.js
  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: bfile('../../SwingSet/test/bootstrap-relay.js'),
      },
    },
    bundles: {
      watcher: { sourceSpec: bfile('./vat-durable-promise-watcher.js') },
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
  // eslint-disable-next-line no-underscore-dangle
  const _messageObject = (presence, methodName, args) =>
    run('messageVatObject', [{ presence, methodName, args }]);

  const S = Symbol.for('passable');
  await run('createVat', [{ name: 'watcher', bundleCapName: 'watcher' }]);
  await messageVat('watcher', 'watchLocalPromise', ['orphaned']);
  await messageVat('watcher', 'watchLocalPromise', ['fulfilled', S]);
  await messageVat('watcher', 'watchLocalPromise', ['rejected', undefined, S]);
  const v1Settlements = await messageVat('watcher', 'getSettlements');
  t.deepEqual(v1Settlements, {
    fulfilled: { status: 'fulfilled', value: S },
    rejected: { status: 'rejected', reason: S },
  });
  await run('upgradeVat', [{ name: 'watcher', bundleCapName: 'watcher' }]);
  const v2Settlements = await messageVat('watcher', 'getSettlements');
  t.deepEqual(v2Settlements, {
    fulfilled: { status: 'fulfilled', value: S },
    rejected: { status: 'rejected', reason: S },
    orphaned: {
      status: 'rejected',
      reason: {
        name: 'vatUpgraded',
        upgradeMessage: 'vat upgraded',
        incarnationNumber: 1,
      },
    },
  });
});
