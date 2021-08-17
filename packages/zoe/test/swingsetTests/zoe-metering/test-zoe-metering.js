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

const CONTRACT_FILES = [
  'infiniteInstallLoop',
  'infiniteInstanceLoop',
  'infiniteTestLoop',
  'testBuiltins',
];
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

const infiniteInstallLoopLog = [
  'installing infiniteInstallLoop',
  'instantiating infiniteInstallLoop',
  'error: Error: vat terminated',
];

test('zoe - metering - infinite loop in installation', async t => {
  const dump = await main(['infiniteInstallLoop']);
  t.deepEqual(dump.log, infiniteInstallLoopLog, 'log is correct');
});

const infiniteInstanceLoopLog = [
  'installing infiniteInstanceLoop',
  'instantiating infiniteInstanceLoop',
  'error: Error: vat terminated',
];

test('zoe - metering - infinite loop in instantiation', async t => {
  const dump = await main(['infiniteInstanceLoop']);
  t.deepEqual(dump.log, infiniteInstanceLoopLog, 'log is correct');
});

const infiniteTestLoopLog = [
  'installing infiniteTestLoop',
  'instantiating infiniteTestLoop',
  'invoking infiniteTestLoop.doTest()',
  'error: Error: vat terminated',
];

test('zoe - metering - infinite loop in contract method', async t => {
  const dump = await main(['infiniteTestLoop']);
  t.deepEqual(dump.log, infiniteTestLoopLog, 'log is correct');
});

const testBuiltinsLog = [
  'installing testBuiltins',
  'instantiating testBuiltins',
  'invoking testBuiltins.doTest()',
  'error: Error: vat terminated',
];

test('zoe - metering - expensive builtins in contract method', async t => {
  const dump = await main(['testBuiltins']);
  t.deepEqual(dump.log, testBuiltinsLog, 'log is correct');
});
