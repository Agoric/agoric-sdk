import '@agoric/install-ses';
import test from 'ava';
import { xsWorkerBin } from '@agoric/xs-vat-worker/src/locate';
import { loadBasedir, buildVatController } from '../../src/index';

test('xs vat manager', async t => {
  if (!xsWorkerBin) {
    console.warn('XS vat worker not built; skipping');
    t.falsy.skip(false);
    return;
  }

  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType: 'xs-worker' };
  const c = await buildVatController(config, []);

  await c.run();
  t.is(c.bootstrapResult.status(), 'fulfilled');

  await c.shutdown();
});

test('nodeWorker vat manager', async t => {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType: 'nodeWorker' };
  const c = await buildVatController(config, []);

  await c.run();
  t.is(c.bootstrapResult.status(), 'fulfilled');

  await c.shutdown();
});

/* // disabling for now due to possible buffering issue on MacOS
test('node-subprocess vat manager', async t => {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType: 'node-subprocess' };
  const c = await buildVatController(config, []);

  await c.run();
  t.is(c.bootstrapResult.status(), 'fulfilled');

  await c.shutdown();
});
*/
