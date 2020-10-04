import '@agoric/install-ses';
import test from 'ava';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { locateWorkerBin } from '@agoric/xs-vat-worker';
import { loadBasedir, buildVatController } from '../../src/index';

const xsWorkerBin = locateWorkerBin({ resolve });
const maybeTestXS = existsSync(xsWorkerBin) ? test : test.skip;

maybeTestXS('xs vat manager', async t => {
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
