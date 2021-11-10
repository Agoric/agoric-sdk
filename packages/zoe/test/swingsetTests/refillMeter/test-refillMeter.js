// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import fs from 'fs';
import path from 'path';
import bundleSource from '@agoric/bundle-source';

import { METER_TYPE } from '../../../../xsnap/api.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const CONTRACT_FILES = ['refillMeterContract'];
const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const bundle = await bundleSource(`${dirname}/${contract}`);
    const obj = { bundle, contract };
    fs.writeFileSync(
      `${dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

async function main(argv) {
  const config = await loadBasedir(dirname);
  config.defaultManagerType = 'xs-worker';
  await generateBundlesP;
  const controller = await buildVatController(config, argv);
  await controller.run();
  return controller.dump();
}

const refillMeterLog = [
  'pre-installation equals expected: true',
  'post-installation equals expected: true',
  'post-startInstance equals expected: true',
  'post-smallComputation1 equals expected: true',
  'post-smallComputation2 equals expected: true',
  'post-smallComputation3 equals expected: true',
  'error: Error: vat terminated',
];

// See https://github.com/Agoric/agoric-sdk/issues/3804
// TODO make this test more robust, or replace with something more
// robust. This test is currently too sensitive to minor variations in
// compute.
test.skip('zoe - metering - refill meter', async t => {
  // If this assertion fails, please update this test with the new
  // computron values. This test aims to be resilient to changes in
  // computron values for particular actions but a significant change
  // may break the test.
  assert(METER_TYPE === 'xs-meter-12');
  const dump = await main(['refillMeter']);
  t.deepEqual(dump.log, refillMeterLog, 'log is correct');
});
