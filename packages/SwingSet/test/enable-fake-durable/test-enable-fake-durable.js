// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
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

  const [storeStatus, storeCapdata] = await run('testStore');
  if (enableFakeDurable) {
    t.is(storeStatus, 'fulfilled');
    t.deepEqual(storeCapdata, { body: '{"@qclass":"undefined"}', slots: [] });
  } else {
    t.is(storeStatus, 'rejected');
    t.deepEqual(storeCapdata, {
      body: '{"@qclass":"error","errorId":"error:liveSlots:v1#70001","message":"fakeDurable may only be used if enableFakeDurable is true","name":"Error"}',
      slots: [],
    });
  }

  const [objStatus, objCapdata] = await run('testObj');
  if (enableFakeDurable) {
    t.is(objStatus, 'fulfilled');
    t.deepEqual(objCapdata, { body: '{"@qclass":"undefined"}', slots: [] });
  } else {
    t.is(objStatus, 'rejected');
    t.deepEqual(objCapdata, {
      body: '{"@qclass":"error","errorId":"error:liveSlots:v1#70002","message":"fakeDurable may only be used if enableFakeDurable is true","name":"Error"}',
      slots: [],
    });
  }
}

test('enableFakeDurable=true', async t => {
  return testEnableFakeDurable(t, true);
});

test('enableFakeDurable=false', async t => {
  return testEnableFakeDurable(t, false);
});
