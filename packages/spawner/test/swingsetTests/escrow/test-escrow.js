import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';
import path from 'path';

async function main(basedir, argv) {
  const dir = path.resolve(`${__dirname}/..`, basedir);
  const config = await loadBasedir(dir);
  const controller = await buildVatController(config, argv);
  await controller.run();
  return controller.dump();
}

const escrowGolden = ['starting testEscrowServiceSuccess'];

test('escrow checkUnits w/SES', async t => {
  const dump = await main('escrow', ['escrow matches']);
  t.deepEquals(dump.log, escrowGolden);
  t.end();
});

const escrowMismatchGolden = [
  'starting testEscrowServiceCheckMismatches',
  'expected unsuccessful check Error: Escrow checkUnits: different at top.right.value: ((a string)) vs ((a string))\nSee console for error data.',
];

test.skip('escrow check misMatches w/SES', async t => {
  const dump = await main('escrow', ['escrow misMatches']);
  t.deepEquals(dump.log, escrowMismatchGolden);
  t.end();
});

const escrowCheckPartialWrongPriceGolden = [
  'starting testEscrowServiceCheckPartial wrong price',
  'expected wrong price Error: Escrow checkPartialUnits seat: different at top.value: ((a number)) vs ((a number))\nSee console for error data.',
];

test.skip('escrow check partial misMatches w/SES', async t => {
  const dump = await main('escrow', ['escrow partial price']);
  t.deepEquals(dump.log, escrowCheckPartialWrongPriceGolden);
  t.end();
});

const escrowCheckPartialWrongStockGolden = [
  'starting testEscrowServiceCheckPartial wrong stock',
  'expected wrong stock Error: Escrow checkPartialUnits seat: different at top.value: ((a string)) vs ((a string))\nSee console for error data.',
];

test.skip('escrow check partial misMatches w/SES', async t => {
  const dump = await main('escrow', ['escrow partial stock']);
  t.deepEquals(dump.log, escrowCheckPartialWrongStockGolden);
  t.end();
});

const escrowCheckPartialWrongSeatGolden = [
  'starting testEscrowServiceCheckPartial wrong seat',
  'expected wrong side Error: Escrow checkPartialUnits seat: label not found on right at top: ((an object)) vs ((an object))\nSee console for error data.',
];

test.skip('escrow check partial wrong seat w/SES', async t => {
  const dump = await main('escrow', ['escrow partial seat']);
  t.deepEquals(dump.log, escrowCheckPartialWrongSeatGolden);
  t.end();
});
