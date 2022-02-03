import { test } from '../../tools/prepare-test-env-ava.js';

import { loadBasedir, buildVatController } from '../../src/index.js';

function canBlock(managerType) {
  // nodeworker cannot block: the thread-to-thread port it uses provides a
  // strictly async API. The subprocess-node worker *should* be able to
  // block, but we didn't bother implementing the return pathway, so treat it
  // as non-blocking.
  return managerType === 'local' || managerType === 'local';
}
const expected = [
  [
    'B good',
    'C good',
    'F good',
    'three good',
    'vs1 good',
    'vs2 good',
    'exit good',
    'exitWF good',
  ],
  'rp3 good',
];

async function makeController(managerType) {
  const config = await loadBasedir(new URL('./', import.meta.url).pathname);
  config.vats.target.creationOptions = {
    managerType,
    enableDisavow: true,
    enableVatstore: canBlock(managerType),
  };
  const canCallNow = canBlock(managerType);
  const canVatstore = canBlock(managerType);
  config.vats.target.parameters = { canCallNow, canVatstore };
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
