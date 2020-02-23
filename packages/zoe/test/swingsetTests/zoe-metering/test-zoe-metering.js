import { test } from 'tape-promise/tape';
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import path from 'path';
import fs from 'fs';
import bundleSource from '@agoric/bundle-source';

// Don't let unhandled promises crash our process.
process.on('unhandledRejection', e => console.log('unhandled rejection', e));

const CONTRACT_FILES = [
  'infiniteInstallLoop',
  'infiniteInstanceLoop',
  'infiniteTestLoop',
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

test('zoe - metering - infinite loop in installation', async t => {
  try {
    const dump = await main('zoe-metering', true, ['infiniteInstallLoop']);
    t.deepEquals(dump.log, 'foo', 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('zoe - metering - infinite loop in instantiation', async t => {
  try {
    const dump = await main('zoe-metering', true, ['infiniteInstanceLoop']);
    t.deepEquals(dump.log, 'foo', 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('zoe - metering - infinite loop in contract method', async t => {
  try {
    const dump = await main('zoe-metering', true, ['infiniteTestLoop']);
    t.deepEquals(dump.log, 'foo', 'log is correct');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
