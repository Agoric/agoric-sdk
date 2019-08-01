import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

async function main(withSES, basedir, argv) {
  const config = await loadBasedir(basedir);
  const ldSrcPath = require.resolve(
    '@agoric/swingset-vat/src/devices/loopbox-src',
  );
  config.devices = [['loopbox', ldSrcPath, {}]];

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const escrowGolden = ['=> setup called', 'starting testEscrowServiceSuccess'];

test('escrow checkAmount w/SES', async t => {
  const dump = await main(true, 'test/core', ['escrow matches']);
  t.deepEquals(dump.log, escrowGolden);
  t.end();
});

test('escrow checkAmount', async t => {
  const dump = await main(false, 'test/core', ['escrow matches']);
  t.deepEquals(dump.log, escrowGolden);
  t.end();
});

const escrowMismatchGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckMismatches',
  'expected unsuccessful check Error: Escrow checkAmount: different at top.right.quantity: ((a string)) vs ((a string))\nSee console for error data.',
];

test('escrow check misMatches w/SES', async t => {
  const dump = await main(true, 'test/core', ['escrow misMatches']);
  t.deepEquals(dump.log, escrowMismatchGolden);
  t.end();
});

test('escrow check misMatches', async t => {
  const dump = await main(false, 'test/core', ['escrow misMatches']);
  t.deepEquals(dump.log, escrowMismatchGolden);
  t.end();
});

const escrowCheckPartialWrongPriceGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckPartial wrong price',
  'expected wrong price Error: Escrow checkPartialAmount seat: different at top.quantity: ((a number)) vs ((a number))\nSee console for error data.',
];

test('escrow check partial misMatches w/SES', async t => {
  const dump = await main(true, 'test/core', ['escrow partial price']);
  t.deepEquals(dump.log, escrowCheckPartialWrongPriceGolden);
  t.end();
});

test('escrow check partial misMatches', async t => {
  const dump = await main(false, 'test/core', ['escrow partial price']);
  t.deepEquals(dump.log, escrowCheckPartialWrongPriceGolden);
  t.end();
});

const escrowCheckPartialWrongStockGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckPartial wrong stock',
  'expected wrong stock Error: Escrow checkPartialAmount seat: different at top.quantity: ((a string)) vs ((a string))\nSee console for error data.',
];

test('escrow check partial misMatches w/SES', async t => {
  const dump = await main(true, 'test/core', ['escrow partial stock']);
  t.deepEquals(dump.log, escrowCheckPartialWrongStockGolden);
  t.end();
});

test('escrow check partial misMatches', async t => {
  const dump = await main(false, 'test/core', ['escrow partial stock']);
  t.deepEquals(dump.log, escrowCheckPartialWrongStockGolden);
  t.end();
});

const escrowCheckPartialWrongSeatGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckPartial wrong seat',
  'expected wrong side Error: Escrow checkPartialAmount seat: label not found on right at top: ((a object)) vs ((a object))\nSee console for error data.',
];

test('escrow check partial wrong seat w/SES', async t => {
  const dump = await main(true, 'test/core', ['escrow partial seat']);
  t.deepEquals(dump.log, escrowCheckPartialWrongSeatGolden);
  t.end();
});

test('escrow check partial wrong seat', async t => {
  const dump = await main(false, 'test/core', ['escrow partial seat']);
  t.deepEquals(dump.log, escrowCheckPartialWrongSeatGolden);
  t.end();
});
