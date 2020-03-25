import { test } from 'tape-promise/tape';
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import path from 'path';
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
    const { source, moduleFormat } = await bundleSource(
      `${__dirname}/${contract}`,
    );
    const obj = { source, moduleFormat, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

async function main(basedir, withSES, argv) {
  const dir = path.resolve('test/swingsetTests', basedir);
  const config = await loadBasedir(dir);
  const ldSrcPath = require.resolve(
    '@agoric/swingset-vat/src/devices/loopbox-src',
  );
  config.devices = [['loopbox', ldSrcPath, {}]];
  await generateBundlesP;
  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const infiniteInstallLoopLog = ['installing infiniteInstallLoop'];
test('zoe - metering - infinite loop in installation', async t => {
  t.plan(1);
  try {
    const dump = await main('zoe-metering', true, ['infiniteInstallLoop']);
    t.deepEquals(dump.log, infiniteInstallLoopLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const infiniteInstanceLoopLog = [
  'installing infiniteInstanceLoop',
  'instantiating infiniteInstanceLoop',
];
test('zoe - metering - infinite loop in instantiation', async t => {
  t.plan(1);
  try {
    const dump = await main('zoe-metering', true, ['infiniteInstanceLoop']);
    t.deepEquals(dump.log, infiniteInstanceLoopLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const infiniteTestLoopLog = [
  'installing infiniteTestLoop',
  'instantiating infiniteTestLoop',
  'invoking infiniteTestLoop.doTest()',
];
test('zoe - metering - infinite loop in contract method', async t => {
  t.plan(1);
  try {
    const dump = await main('zoe-metering', true, ['infiniteTestLoop']);
    t.deepEquals(dump.log, infiniteTestLoopLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

const testBuiltinsLog = [
  'installing testBuiltins',
  'instantiating testBuiltins',
  'invoking testBuiltins.doTest()',
];
test('zoe - metering - expensive builtins in contract method', async t => {
  t.plan(1);
  try {
    const dump = await main('zoe-metering', true, ['testBuiltins']);
    t.deepEquals(dump.log, testBuiltinsLog, 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});
