import '@agoric/install-ses';
import test from 'ava';
import { loadBasedir, buildVatController } from '../../src/index';

const expected = [['B good', 'C good', 'F good', 'three good'], 'rp3 good'];

async function makeController(managerType) {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType };
  const canCallNow = ['local'].indexOf(managerType) !== -1;
  // const canCallNow = ['local', 'xs-worker'].indexOf(managerType) !== -1;
  config.vats.target.parameters = { canCallNow };
  config.devices = {
    add: {
      sourceSpec: require.resolve('./device-add.js'),
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

// The XS worker is disabled until the xsnap-based approach is ready for
// testing. Unlike the old approach, I think we'll build xsnap
// unconditionally, so we won't need the old 'maybeTestXS' conditional.

test.skip('xs vat manager', async t => {
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
