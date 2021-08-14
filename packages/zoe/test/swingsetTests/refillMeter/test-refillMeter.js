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
  'pre-installation 5275000. Equals expected: true',
  'post-installation 5210000. Equals expected: true',
  'post-startInstance 140000. Equals expected: true',
  'if the above is true, meter was refilled once',
  'post-smallComputation1 140000. Equals expected: true',
  'meter does not refill here',
  'post-smallComputation2 70000. Equals expected: true',
  'post-smallComputation3 0. Equals expected: true',
  'error: Error: vat terminated',
];

test('zoe - metering - refill meter', async t => {
  const dump = await main(['refillMeter']);
  t.deepEqual(dump.log, refillMeterLog, 'log is correct');
});
