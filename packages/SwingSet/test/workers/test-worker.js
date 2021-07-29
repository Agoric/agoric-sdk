import { test } from '../../tools/prepare-test-env-ava.js';

import { loadBasedir, buildVatController } from '../../src/index.js';

const expected = [['B good', 'C good', 'F good', 'three good'], 'rp3 good'];

async function makeController(managerType) {
  const config = await loadBasedir(new URL('./', import.meta.url).pathname);
  config.vats.target.creationOptions = { managerType, enableDisavow: true };
  const canCallNow = ['local', 'xs-worker'].indexOf(managerType) !== -1;
  config.vats.target.parameters = { canCallNow };
  config.devices = {
    add: {
      sourceSpec: new URL('device-add.js', import.meta.url).pathname,
      creationOptions: {
        unendowed: true,
      },
    },
  };
  const c = await buildVatController(config, []);
  return c;
}

test('local vat manager', async t => {
  const c = await makeController('local');
  t.teardown(c.shutdown);

  await c.run();
  t.is(c.kpStatus(c.bootstrapResult), 'fulfilled');
  t.deepEqual(c.dump().log, ['testLog works']);
  t.deepEqual(JSON.parse(c.kpResolution(c.bootstrapResult).body), expected);
});

test('xs vat manager', async t => {
  const c = await makeController('xs-worker');
  t.teardown(c.shutdown);

  await c.run();
  t.is(c.kpStatus(c.bootstrapResult), 'fulfilled');
  t.deepEqual(c.dump().log, ['testLog works']);
  t.deepEqual(JSON.parse(c.kpResolution(c.bootstrapResult).body), expected);
});

test('nodeWorker vat manager', async t => {
  const c = await makeController('nodeWorker');
  t.teardown(c.shutdown);

  await c.run();
  t.is(c.kpStatus(c.bootstrapResult), 'fulfilled');
  t.deepEqual(c.dump().log, ['testLog works']);
  t.deepEqual(JSON.parse(c.kpResolution(c.bootstrapResult).body), expected);
});

test('node-subprocess vat manager', async t => {
  const c = await makeController('node-subprocess');
  t.teardown(c.shutdown);

  await c.run();
  t.is(c.kpStatus(c.bootstrapResult), 'fulfilled');
  t.deepEqual(c.dump().log, ['testLog works']);
  t.deepEqual(JSON.parse(c.kpResolution(c.bootstrapResult).body), expected);
});
