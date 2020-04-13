import { test } from 'tape';
import { initSwingStore } from '@agoric/swing-store-simple';

import { buildVatController, loadBasedir } from '../../src';

async function createConfig() {
  const config = await loadBasedir(__dirname);

  config.hostStorage = initSwingStore().storage;
  return config;
}

async function testVatCreationFromBuild(t, withSES) {
  const config = await createConfig();
  const c = await buildVatController(config, withSES, ['newVat']);
  t.equal(c.vatNameToID('vatAdmin'), 'v2');
  t.equal(c.vatNameToID('_bootstrap'), 'v1');
  for (let i = 0; i < 9; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  t.deepEqual(c.dump().log, ['starting newVat test', '13']);
  t.end();
}

test.skip('VatAdmin inner vat creation', async t => {
  await testVatCreationFromBuild(t, true);
});

async function testVatCreationAndObjectHosting(t, withSES) {
  const config = await createConfig();
  const c = await buildVatController(config, withSES, ['counters']);
  await c.run();
  await c.run();
  t.deepEqual(c.dump().log, ['starting counter test', '4', '9', '2']);
  t.end();
}

test.skip('VatAdmin inner vat creation', async t => {
  await testVatCreationAndObjectHosting(t, true);
});

async function testBrokenVatCreation(t, withSES) {
  const config = await createConfig();
  const c = await buildVatController(config, withSES, ['brokenVat']);
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting brokenVat test',
    'yay, rejected: Error: Vat Creation Error: ReferenceError: missing is not defined',
  ]);
  t.end();
}

test.skip('VatAdmin broken vat creation', async t => {
  await testBrokenVatCreation(t, true);
});

async function testGetVatStats(t, withSES) {
  const config = await createConfig();
  const c = await buildVatController(config, withSES, ['vatStats']);
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting stats test',
    '{"objectCount":0,"promiseCount":0,"deviceCount":0,"transcriptCount":0}',
    '4',
    '{"objectCount":0,"promiseCount":2,"deviceCount":0,"transcriptCount":2}',
  ]);
  await c.run();
  t.end();
}

test.skip('VatAdmin get vat stats', async t => {
  await testGetVatStats(t, true);
});
