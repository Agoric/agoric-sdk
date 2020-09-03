/* global harden */

import '@agoric/install-metering-and-ses';
import bundleSource from '@agoric/bundle-source';
import { initSwingStore } from '@agoric/swing-store-simple';
import test from 'ava';
import { buildVatController } from '../../src/index';
import makeNextLog from '../make-nextlog';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

test('metering dynamic vats', async t => {
  // we'll give this bundle to the loader vat, which will use it to create a
  // new (metered) dynamic vat
  const dynamicVatBundle = await bundleSource(
    require.resolve('./metered-dynamic-vat.js'),
  );
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: require.resolve('./vat-load-dynamic.js'),
      },
    },
  };
  const { storage } = initSwingStore();
  const c = await buildVatController(config, [], {
    hostStorage: storage,
  });
  const nextLog = makeNextLog(c);

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // 'createVat' will import the bundle
  c.queueToVatExport(
    'bootstrap',
    'o+0',
    'createVat',
    capargs([dynamicVatBundle]),
  );
  await c.run();
  t.deepEqual(nextLog(), ['created'], 'first create');

  // First, send a message to the dynamic vat that runs normally
  c.queueToVatExport('bootstrap', 'o+0', 'run', capargs([]));
  await c.run();
  t.is(storage.get('vat.dynamicIDs'), '["v6"]');
  t.is(storage.get('ko26.owner'), 'v6');
  t.is(Array.from(storage.getKeys('kp45.', 'kp45/')).length, 5);
  t.is(Array.from(storage.getKeys('v6.', 'v6/')).length, 9);

  t.deepEqual(nextLog(), ['did run'], 'first run ok');

  // Now send a message that makes the dynamic vat exhaust its meter. The
  // message result promise should be rejected, and the control facet should
  // report the vat's demise.  Remnants of the killed vat should be gone
  // from the kernel state store.
  c.queueToVatExport('bootstrap', 'o+0', 'explode', capargs(['allocate']));
  await c.run();
  t.is(storage.get('vat.dynamicIDs'), '[]');
  t.is(storage.get('ko26.owner'), undefined);
  t.is(Array.from(storage.getKeys('kp45.', 'kp45/')).length, 0);
  t.is(Array.from(storage.getKeys('v6.', 'v6/')).length, 0);

  t.deepEqual(
    nextLog(),
    [
      'did explode: vat terminated',
      'terminated: Error: Allocate meter exceeded',
    ],
    'first boom',
  );

  // the dead vat should stay dead
  c.queueToVatExport('bootstrap', 'o+0', 'run', capargs([]));
  await c.run();
  t.deepEqual(nextLog(), ['run exploded: vat terminated'], 'stay dead');
});
