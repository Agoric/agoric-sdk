import { test } from 'tape';
import '../../install-ses.js';
import path from 'path';
import { initSwingStore } from '@agoric/swing-store-simple';
import bundleSource from '@agoric/bundle-source';
import { buildVatController, loadBasedir } from '../../src';

async function doTestSetup(mode) {
  const dir = path.resolve('./test/vat-admin');
  const config = await loadBasedir(dir);
  config.hostStorage = initSwingStore().storage;
  const newVatBundle = await bundleSource(path.resolve('./test/vat-admin/new-vat.js'),
                                          'nestedEvaluate');
  const brokenVatBundle = await bundleSource(path.resolve('./test/vat-admin/broken-vat.js'),
                                             'nestedEvaluate');
  const bundles = { newVatBundle, brokenVatBundle };
  const c = await buildVatController(config, true, [mode, bundles]);
  return c;
}

test('VatAdmin inner vat creation', async t => {
  const c = await doTestSetup('newVat');
  t.equal(c.vatNameToID('vatAdmin'), 'v2');
  t.equal(c.vatNameToID('_bootstrap'), 'v1');
  for (let i = 0; i < 9; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  t.deepEqual(c.dump().log, ['starting newVat test', '13']);
  t.end();
});

test('VatAdmin counter test', async t => {
  const c = await doTestSetup('counters');
  await c.run();
  await c.run();
  t.deepEqual(c.dump().log, ['starting counter test', '4', '9', '2']);
  t.end();
});

test('VatAdmin broken vat creation', async t => {
  const c = await doTestSetup('brokenVat');
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting brokenVat test',
    'yay, rejected: Error: Vat Creation Error: ReferenceError: missing is not defined',
  ]);
  t.end();
});

test('VatAdmin get vat stats', async t => {
  const c = await doTestSetup('vatStats');
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting stats test',
    '{"objectCount":0,"promiseCount":0,"deviceCount":0,"transcriptCount":0}',
    '4',
    '{"objectCount":0,"promiseCount":2,"deviceCount":0,"transcriptCount":2}',
  ]);
  await c.run();
  t.end();
});
