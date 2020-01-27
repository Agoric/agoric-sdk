import { test } from 'tape';
import path from 'path';
import { buildVatController, loadBasedir } from '../../src';
import { buildStorageInMemory } from '../../src/hostStorage';

async function createConfig() {
  const dir = path.resolve('./test/vat-admin');
  const config = await loadBasedir(dir);

  const storage = buildStorageInMemory();
  config.hostStorage = storage.storage;
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

test('VatAdmin inner vat creation', async t => {
  await testVatCreationFromBuild(t, true);
});

test('VatAdmin inner vat creation non-SES', async t => {
  await testVatCreationFromBuild(t, false);
});

async function testVatCreationAndObjectHosting(t, withSES) {
  const config = await createConfig();
  const c = await buildVatController(config, withSES, ['counters']);
  await c.run();
  await c.run();
  t.deepEqual(c.dump().log, ['starting counter test', '4', '9', '2']);
  t.end();
}

test('VatAdmin inner vat creation', async t => {
  await testVatCreationAndObjectHosting(t, true);
});

test('VatAdmin inner vat creation non-SES', async t => {
  await testVatCreationAndObjectHosting(t, false);
});

async function testBrokenVatCreation(t, withSES) {
  const config = await createConfig();
  const c = await buildVatController(config, withSES, ['brokenVat']);
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting brokenVat test',
    'yay, rejected: Error: Vat Creation Error: ReferenceError: harden is not defined',
  ]);
  t.end();
}

test('VatAdmin broken vat creation', async t => {
  await testBrokenVatCreation(t, true);
});

test('VatAdmin broken vat creation non-SES', async t => {
  await testBrokenVatCreation(t, false);
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

test('VatAdmin get vat stats', async t => {
  await testGetVatStats(t, true);
});

test('VatAdmin get vat stats non-SES', async t => {
  await testGetVatStats(t, false);
});
