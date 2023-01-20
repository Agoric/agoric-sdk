// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { kunser } from '../../src/lib/kmarshal.js';

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
  t.is(kvStore.get('kernel.defaultReapInterval'), '1');
  c.changeKernelOptions({
    snapshotInterval: 1000,
    defaultReapInterval: 10,
  });
  t.is(kvStore.get('kernel.defaultReapInterval'), '10');
  t.throws(() => c.changeKernelOptions({ defaultReapInterval: 'banana' }), {
    message: 'invalid defaultReapInterval value',
  });
  t.throws(() => c.changeKernelOptions({ snapshotInterval: 'elephant' }), {
    message: 'invalid heap snapshotInterval value',
  });
  t.throws(() => c.changeKernelOptions({ baz: 'howdy' }), {
    message: 'unknown option "baz"',
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
  t.is(kvStore.get('v6.reapInterval'), '10');

  // now fiddle with stuff
  const [c1Status, c1Result] = await run('change', [{ foo: 47 }]);
  t.is(c1Status, 'fulfilled');
  t.is(c1Result, 'invalid option "foo"');

  const [c2Status, c2Result] = await run('change', [
    { virtualObjectCacheSize: -1 },
  ]);
  t.is(c2Status, 'fulfilled');
  t.is(c2Result, 'invalid virtualObjectCacheSize value');

  const [c3Status, c3Result] = await run('change', [{ reapInterval: 'maybe' }]);
  t.is(c3Status, 'fulfilled');
  t.is(c3Result, 'invalid reapInterval value');

  const [c4Status, c4Result] = await run('change', [
    { virtualObjectCacheSize: 100, reapInterval: 20 },
  ]);
  t.is(c4Status, 'fulfilled');
  t.is(c4Result, 'ok');
  t.is(kvStore.get('v6.reapInterval'), '20');
}

test('change vat options', async t => {
  return testChangeParameters(t);
});
