// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { parse } from '@endo/marshal';
// eslint-disable-next-line import/order
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

async function testEnableFakeDurable(t, enableFakeDurable) {
  const config = {
    bootstrap: 'bootstrap',
    includeDevDependencies: true, // for vat-data
    enableFakeDurable,
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-enable-fake-durable.js') },
    },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  for (const mode of ['testStore', 'testObj']) {
    // eslint-disable-next-line no-await-in-loop
    const [status, capdata] = await run(mode);
    if (enableFakeDurable) {
      t.is(status, 'fulfilled');
      t.deepEqual(capdata, { body: '{"@qclass":"undefined"}', slots: [] });
    } else {
      t.is(status, 'rejected');
      const err = parse(capdata.body);
      t.truthy(err instanceof Error);
      t.is(
        err.message,
        'fakeDurable may only be used if enableFakeDurable is true',
      );
    }
  }
}

test('enableFakeDurable=true', async t => {
  return testEnableFakeDurable(t, true);
});

test('enableFakeDurable=false', async t => {
  return testEnableFakeDurable(t, false);
});
