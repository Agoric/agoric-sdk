import '@agoric/install-ses';
import tap from 'tap';
import { loadBasedir, buildVatController } from '../../src/index';

tap.test('nodeWorker vat manager', async t => {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType: 'nodeWorker' };
  const c = await buildVatController(config, []);

  await c.run();
  t.equal(c.bootstrapResult.status(), 'fulfilled');

  await c.shutdown();
  t.end();
});
