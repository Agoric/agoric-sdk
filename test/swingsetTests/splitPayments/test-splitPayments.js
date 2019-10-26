import { test } from 'tape-promise/tape';
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
  'oldPayment balance:{"label":{"assay":{},"allegedName":"moola"},"extent":1000}',
  'splitPayment[0] balance: {"label":{"assay":{},"allegedName":"moola"},"extent":900}',
];

test('test splitPayments with SES', async t => {
  const dump = await main(true, 'splitPayments', ['splitPayments']);
  t.deepEquals(dump.log, expectedTapFaucetLog);
  t.end();
});

test('test splitPayments without SES', async t => {
  const dump = await main(false, 'splitPayments', ['splitPayments']);
  t.deepEquals(dump.log, expectedTapFaucetLog);
  t.end();
});
