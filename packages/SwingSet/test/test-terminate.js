import '@agoric/install-ses';
import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadSwingsetConfigFile } from '../src/index';

test('terminate', async t => {
  const configPath = path.resolve(__dirname, 'basedir-terminate/swingset.json');
  const config = loadSwingsetConfigFile(configPath);
  const controller = await buildVatController(config);
  t.equal(controller.bootstrapResult.status(), 'pending');
  await controller.run();
  t.equal(controller.bootstrapResult.status(), 'fulfilled');
  t.deepEqual(controller.bootstrapResult.resolution(), {
    body: '"vat is dead"',
    slots: [],
  });
  t.end();
});
