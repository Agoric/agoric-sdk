import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';
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

const escrowGolden = ['=> setup called', 'starting testEscrowServiceSuccess'];

test('escrow checkUnits w/SES', async t => {
  const dump = await main(true, 'escrow', ['escrow matches']);
  t.deepEquals(dump.log, escrowGolden);
  t.end();
});

test('escrow checkUnits', async t => {
  const dump = await main(false, 'escrow', ['escrow matches']);
  t.deepEquals(dump.log, escrowGolden);
  t.end();
});

const escrowMismatchGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckMismatches',
  'expected unsuccessful check Error: Escrow checkUnits: different at top.right.extent: ((a string)) vs ((a string))\nSee console for error data.',
];

test('escrow check misMatches w/SES', async t => {
  const dump = await main(true, 'escrow', ['escrow misMatches']);
  t.deepEquals(dump.log, escrowMismatchGolden);
  t.end();
});

test('escrow check misMatches', async t => {
  const dump = await main(false, 'escrow', ['escrow misMatches']);
  t.deepEquals(dump.log, escrowMismatchGolden);
  t.end();
});

const escrowCheckPartialWrongPriceGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckPartial wrong price',
  'expected wrong price Error: Escrow checkPartialUnits seat: different at top.extent: ((a number)) vs ((a number))\nSee console for error data.',
];

test('escrow check partial misMatches w/SES', async t => {
  const dump = await main(true, 'escrow', ['escrow partial price']);
  t.deepEquals(dump.log, escrowCheckPartialWrongPriceGolden);
  t.end();
});

test('escrow check partial misMatches', async t => {
  const dump = await main(false, 'escrow', ['escrow partial price']);
  t.deepEquals(dump.log, escrowCheckPartialWrongPriceGolden);
  t.end();
});

const escrowCheckPartialWrongStockGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckPartial wrong stock',
  'expected wrong stock Error: Escrow checkPartialUnits seat: different at top.extent: ((a string)) vs ((a string))\nSee console for error data.',
];

test('escrow check partial misMatches w/SES', async t => {
  const dump = await main(true, 'escrow', ['escrow partial stock']);
  t.deepEquals(dump.log, escrowCheckPartialWrongStockGolden);
  t.end();
});

test('escrow check partial misMatches', async t => {
  const dump = await main(false, 'escrow', ['escrow partial stock']);
  t.deepEquals(dump.log, escrowCheckPartialWrongStockGolden);
  t.end();
});

const escrowCheckPartialWrongSeatGolden = [
  '=> setup called',
  'starting testEscrowServiceCheckPartial wrong seat',
  'expected wrong side Error: Escrow checkPartialUnits seat: label not found on right at top: ((a object)) vs ((a object))\nSee console for error data.',
];

test('escrow check partial wrong seat w/SES', async t => {
  const dump = await main(true, 'escrow', ['escrow partial seat']);
  t.deepEquals(dump.log, escrowCheckPartialWrongSeatGolden);
  t.end();
});

test('escrow check partial wrong seat', async t => {
  const dump = await main(false, 'escrow', ['escrow partial seat']);
  t.deepEquals(dump.log, escrowCheckPartialWrongSeatGolden);
  t.end();
});
