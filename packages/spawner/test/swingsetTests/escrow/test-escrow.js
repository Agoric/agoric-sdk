/* global __dirname */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

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

test.skip('escrow checkUnits w/SES', async t => {
  const dump = await main('escrow', ['escrow matches']);
  t.deepEqual(dump.log, escrowGolden);
});

const escrowMismatchGolden = [
  'starting testEscrowServiceCheckMismatches',
  /expected unsuccessful check Error: Escrow checkUnits: different at top.right.value: (.*) vs (.*)/,
];

test.skip('escrow check misMatches w/SES', async t => {
  const dump = await main('escrow', ['escrow misMatches']);
  t.deepEqual(dump.log, escrowMismatchGolden);
});

const escrowCheckPartialWrongPriceGolden = [
  'starting testEscrowServiceCheckPartial wrong price',
  /expected wrong price Error: Escrow checkPartialUnits seat: different at top.value: (.*) vs (.*)/,
];

test.skip('escrow check partial price misMatches w/SES', async t => {
  const dump = await main('escrow', ['escrow partial price']);
  t.deepEqual(dump.log, escrowCheckPartialWrongPriceGolden);
});

const escrowCheckPartialWrongStockGolden = [
  'starting testEscrowServiceCheckPartial wrong stock',
  /expected wrong stock Error: Escrow checkPartialUnits seat: different at top.value: (.*) vs (.*)/,
];

test.skip('escrow check partial stock misMatches w/SES', async t => {
  const dump = await main('escrow', ['escrow partial stock']);
  t.deepEqual(dump.log, escrowCheckPartialWrongStockGolden);
});

const escrowCheckPartialWrongSeatGolden = [
  'starting testEscrowServiceCheckPartial wrong seat',
  /expected wrong side Error: Escrow checkPartialUnits seat: label not found on right at top: (.*) vs (.*)/,
];

test.skip('escrow check partial wrong seat w/SES', async t => {
  const dump = await main('escrow', ['escrow partial seat']);
  t.deepEqual(dump.log, escrowCheckPartialWrongSeatGolden);
});
