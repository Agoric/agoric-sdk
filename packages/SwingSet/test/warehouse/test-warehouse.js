/* global __dirname */
import { test } from '../../tools/prepare-test-env-ava';

import { loadBasedir, buildVatController } from '../../src/index';

async function makeController(managerType, maxVatsOnline) {
  const config = await loadBasedir(__dirname);
  config.vats.target.creationOptions = { managerType, enableDisavow: true };
  config.vats.target2 = config.vats.target;
  config.vats.target3 = config.vats.target;
  config.vats.target4 = config.vats.target;
  const warehousePolicy = { maxVatsOnline };
  const c = await buildVatController(config, [], { warehousePolicy });
  return c;
}

test('4 vats in warehouse with 2 online', async t => {
  const c = await makeController('xs-worker', 2);
  t.teardown(c.shutdown);

  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(c.bootstrapResult).body), [
    [1],
    [2],
    [3],
    [4],
  ]);
});
