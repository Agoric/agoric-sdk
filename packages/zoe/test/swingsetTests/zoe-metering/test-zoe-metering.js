import '@agoric/install-metering-and-ses';
import { test } from 'tape-promise/tape';
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
test('zoe - metering - infinite loop in installation', async t => {
  t.plan(1);
  try {
    const dump = await main(['infiniteInstallLoop']);
    t.deepEquals(dump.log, infiniteInstallLoopLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const infiniteInstanceLoopLog = [
  'installing infiniteInstanceLoop',
  'instantiating infiniteInstanceLoop',
  'error: RangeError: Compute meter exceeded',
];
test('zoe - metering - infinite loop in instantiation', async t => {
  t.plan(1);
  try {
    const dump = await main(['infiniteInstanceLoop']);
    t.deepEquals(dump.log, infiniteInstanceLoopLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const infiniteTestLoopLog = [
  'installing infiniteTestLoop',
  'instantiating infiniteTestLoop',
  'invoking infiniteTestLoop.doTest()',
  'error: RangeError: Compute meter exceeded',
];
test('zoe - metering - infinite loop in contract method', async t => {
  t.plan(1);
  try {
    const dump = await main(['infiniteTestLoop']);
    t.deepEquals(dump.log, infiniteTestLoopLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const testBuiltinsLog = [
  'installing testBuiltins',
  'instantiating testBuiltins',
  'invoking testBuiltins.doTest()',
  'error: RangeError: Allocate meter exceeded',
];
test('zoe - metering - expensive builtins in contract method', async t => {
  t.plan(1);
  try {
    const dump = await main(['testBuiltins']);
    t.deepEquals(dump.log, testBuiltinsLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});
