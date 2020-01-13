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
  t.equal(c.vatNameToID('vatAdmin'), 'v1');
  t.equal(c.vatNameToID('_bootstrap'), 'v2');
  for (let i = 0; i < 11; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  t.deepEqual(c.dump().log, ['starting wake test', '13']);
  t.end();
}

test('VatAdmin inner vat creation', async t => {
  await testVatCreationFromBuild(t, true);
});

test.skip('VatAdmin inner vat creation non-SES', async t => {
  await testVatCreationFromBuild(t, false);
});
