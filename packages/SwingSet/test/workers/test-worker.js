import '@agoric/install-ses';
import test from 'ava';
import { loadBasedir, buildVatController } from '../../src/index';

// The XS worker is disabled until the xsnap-based approach is ready for
// testing. Unlike the old approach, I think we'll build xsnap
// unconditionally, so we won't need the old 'maybeTestXS' conditional.

test.skip('xs vat manager', async t => {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType: 'xs-worker' };
  const c = await buildVatController(config, []);
  t.teardown(c.shutdown);

  await c.run();
  t.is(c.kpStatus(c.bootstrapResult), 'fulfilled');
  t.deepEqual(c.dump().log, ['testLog works']);
});

test('nodeWorker vat manager', async t => {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType: 'nodeWorker' };
  const c = await buildVatController(config, []);
  t.teardown(c.shutdown);

  await c.run();
  t.is(c.kpStatus(c.bootstrapResult), 'fulfilled');
  t.deepEqual(c.dump().log, ['testLog works']);
});

test('node-subprocess vat manager', async t => {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType: 'node-subprocess' };
  const c = await buildVatController(config, []);
  t.teardown(c.shutdown);

  await c.run();
  t.is(c.kpStatus(c.bootstrapResult), 'fulfilled');
  t.deepEqual(c.dump().log, ['testLog works']);
});
