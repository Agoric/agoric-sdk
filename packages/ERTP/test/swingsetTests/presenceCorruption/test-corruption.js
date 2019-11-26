import { test } from 'tape-promise/tape';
import path from 'path';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

// This is a test that demonstrates an issue with the current implementation
// of eventual send. It passes with the current (2019/08/05) known good state,
// but eventual send will need some work so it doesn't break multi-vat sharing.

async function main(withSES, basedir, argv) {
  const dir = path.resolve('test/swingsetTests', basedir);
  const config = await loadBasedir(dir);
  const ldSrcPath = require.resolve(
    '@agoric/swingset-vat/src/devices/loopbox-src',
  );
  config.devices = [['loopbox', ldSrcPath, {}]];

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const corruptedPresenceGolden = [
  '=> setup called',
  '++ Expect creation of purse',
];

test('`run corrupted presence with SES', async t => {
  const dump = await main(true, 'presenceCorruption', ['corrupted-presence']);
  t.deepEquals(dump.log, corruptedPresenceGolden);
  t.end();
});
