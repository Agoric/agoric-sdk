import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
import path from 'path';

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

const expectedTapFaucetLog = [
  '=> setup called',
  'start test splitPayments',
  'oldPayment balance:{"brand":{},"extent":1000}',
  'splitPayment[0] balance: {"brand":{},"extent":10}',
  'splitPayment[1] balance: {"brand":{},"extent":990}',
];

test('test splitPayments with SES', async t => {
  const dump = await main(true, 'splitPayments', ['splitPayments']);
  t.deepEquals(dump.log, expectedTapFaucetLog);
  t.end();
});
