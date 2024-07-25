// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { kunser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

async function testChangeParameters(t) {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-change-parameters.js') },
    },
    bundles: {
      carol: { sourceSpec: bfile('vat-carol.js') },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  const { kvStore } = kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage, null);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();
  t.deepEqual(JSON.parse(kvStore.get('kernel.defaultReapDirtThreshold')), {
    deliveries: 1,
    gcKrefs: 20,
    computrons: 'never',
  });
  c.changeKernelOptions({
    snapshotInterval: 1000,
    defaultReapInterval: 10,
  });
  t.deepEqual(JSON.parse(kvStore.get('kernel.defaultReapDirtThreshold')), {
    deliveries: 10,
    gcKrefs: 20,
    computrons: 'never',
  });
  t.throws(() => c.changeKernelOptions({ defaultReapInterval: 'banana' }), {
    message: 'defaultReapInterval banana must be a positive number or "never"',
  });
  t.throws(() => c.changeKernelOptions({ snapshotInterval: 'elephant' }), {
    message: 'invalid heap snapshotInterval value',
  });
  t.throws(() => c.changeKernelOptions({ baz: 'howdy' }), {
    message: 'unknown option "baz"',
  });
  c.changeKernelOptions({
    defaultReapGCKrefs: 77,
  });
  t.deepEqual(JSON.parse(kvStore.get('kernel.defaultReapDirtThreshold')), {
    deliveries: 10,
    gcKrefs: 77,
    computrons: 'never',
  });

  async function run(method, args = []) {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    return [status, kunser(result)];
  }

  // setup target vat
  const [prepStatus] = await run('prepare', []);
  t.is(prepStatus, 'fulfilled');
  // the vat was created without option overrides, so
  // reapDirtThreshold will be empty (everything defaults to the
  // kernel-wide values)
  t.deepEqual(JSON.parse(kvStore.get('v6.options')).reapDirtThreshold, {});

  // now fiddle with stuff
  const [c1Status, c1Result] = await run('change', [{ foo: 47 }]);
  t.is(c1Status, 'fulfilled');
  t.is(c1Result, 'invalid option "foo"');

  const [c3Status, c3Result] = await run('change', [{ reapInterval: 'maybe' }]);
  t.is(c3Status, 'fulfilled');
  t.is(c3Result, 'invalid reapInterval value');

  const [c4Status, c4Result] = await run('change', [{ reapInterval: 20 }]);
  t.is(c4Status, 'fulfilled');
  t.is(c4Result, 'ok');
  t.deepEqual(JSON.parse(kvStore.get('v6.options')).reapDirtThreshold, {
    deliveries: 20,
  });
}

test('change vat options', async t => {
  return testChangeParameters(t);
});
