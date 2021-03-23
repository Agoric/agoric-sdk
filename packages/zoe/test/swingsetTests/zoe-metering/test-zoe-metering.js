/* global process __dirname */

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-metering-and-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import fs from 'fs';
import bundleSource from '../../bundle-source';

// Don't let unhandled promises crash our process.
process.on('unhandledRejection', e => console.log('unhandled rejection', e));

const CONTRACT_FILES = [
  'infiniteInstallLoop',
  'infiniteInstanceLoop',
  'infiniteTestLoop',
  'testBuiltins',
];
const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const bundle = await bundleSource(`${__dirname}/${contract}`);
    const obj = { bundle, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

async function main(argv) {
  const config = await loadBasedir(__dirname);
  await generateBundlesP;
  const controller = await buildVatController(config, argv);
  await controller.run();
  return controller.dump();
}

const infiniteInstallLoopLog = [
  'installing infiniteInstallLoop',
  'instantiating infiniteInstallLoop',
  'error: RangeError: Compute meter exceeded',
];
// TODO: Unskip. See https://github.com/Agoric/agoric-sdk/issues/1625
test.skip('zoe - metering - infinite loop in installation', async t => {
  const dump = await main(['infiniteInstallLoop']);
  t.deepEqual(dump.log, infiniteInstallLoopLog, 'log is correct');
});

const infiniteInstanceLoopLog = [
  'installing infiniteInstanceLoop',
  'instantiating infiniteInstanceLoop',
  'error: RangeError: Compute meter exceeded',
];
// TODO: Unskip. See https://github.com/Agoric/agoric-sdk/issues/1625
test.skip('zoe - metering - infinite loop in instantiation', async t => {
  const dump = await main(['infiniteInstanceLoop']);
  t.deepEqual(dump.log, infiniteInstanceLoopLog, 'log is correct');
});

const infiniteTestLoopLog = [
  'installing infiniteTestLoop',
  'instantiating infiniteTestLoop',
  'invoking infiniteTestLoop.doTest()',
  'error: RangeError: Compute meter exceeded',
];
// TODO: Unskip. See https://github.com/Agoric/agoric-sdk/issues/1625
test.skip('zoe - metering - infinite loop in contract method', async t => {
  const dump = await main(['infiniteTestLoop']);
  t.deepEqual(dump.log, infiniteTestLoopLog, 'log is correct');
});

const testBuiltinsLog = [
  'installing testBuiltins',
  'instantiating testBuiltins',
  'invoking testBuiltins.doTest()',
  'error: RangeError: Allocate meter exceeded',
];
// TODO: Unskip. See https://github.com/Agoric/agoric-sdk/issues/1625
test.skip('zoe - metering - expensive builtins in contract method', async t => {
  const dump = await main(['testBuiltins']);
  t.deepEqual(dump.log, testBuiltinsLog, 'log is correct');
});
