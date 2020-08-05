import '@agoric/install-ses';
import tap from 'tap';
import { buildVatController } from '../../src/index';

tap.test('nodeWorker vat manager', async t => {
  const config = {
    vats: new Map(),
    bootstrapIndexJS: require.resolve('./bootstrap.js'),
  };
  config.vats.set('target', {
    sourcepath: require.resolve('./vat-target.js'),
    options: { managerType: 'nodeWorker' },
  });
  const c = await buildVatController(config, []);

  await c.run();
  t.equal(c.bootstrapResult.status(), 'fulfilled');

  await c.shutdown();
  t.end();
});
