/* global require */
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

  // extract the vatID for the newly-created dynamic vat
  const dynamicVatIDs = JSON.parse(storage.get('vat.dynamicIDs'));
  t.is(dynamicVatIDs.length, 1);
  const vatID = dynamicVatIDs[0];
  // and it's root object, by peeking into its c-list
  const root = storage.get(`${vatID}.c.o+0`);

  // and grab a kpid that won't be resolved until the vat dies
  const r = c.queueToVatExport('bootstrap', 'o+0', 'getNever', capargs([]));
  await c.run();
  const neverArgs = c.kpResolution(r);
  const neverKPID = neverArgs.slots[0];

  // First, send a message to the dynamic vat that runs normally
  c.queueToVatExport('bootstrap', 'o+0', 'run', capargs([]));
  await c.run();
  t.is(JSON.parse(storage.get('vat.dynamicIDs')).length, 1);
  t.is(storage.get(`${root}.owner`), vatID);
  t.is(Array.from(storage.getKeys(`${vatID}`, `${vatID}/`)).length, 12);
  // neverKPID should still be unresolved
  t.is(storage.get(`${neverKPID}.state`), 'unresolved');

  t.deepEqual(nextLog(), ['did run'], 'first run ok');

  // Now send a message that makes the dynamic vat exhaust its meter. The
  // message result promise should be rejected, and the control facet should
  // report the vat's demise.  Remnants of the killed vat should be gone
  // from the kernel state store.
  c.queueToVatExport('bootstrap', 'o+0', 'explode', capargs(['allocate']));
  await c.run();
  t.is(JSON.parse(storage.get('vat.dynamicIDs')).length, 0);
  t.is(storage.get(`${root}.owner`), undefined);
  t.is(Array.from(storage.getKeys(`${vatID}`, `${vatID}/`)).length, 0);
  // neverKPID should be rejected
  t.is(storage.get(`${neverKPID}.state`), 'rejected');
  t.is(
    storage.get(`${neverKPID}.data.body`),
    JSON.stringify({
      '@qclass': 'error',
      name: 'Error',
      message: 'vat terminated',
    }),
  );
  // TODO: the rejection shouldn't reveal the reason, maybe use this instead:
  // t.is(storage.get(`${neverKPID}.data.body`),
  //      JSON.stringify('vat terminated'));

  t.deepEqual(
    nextLog(),
    [
      'did explode: Error: vat terminated',
      'terminated: Error: Allocate meter exceeded',
    ],
    'first boom',
  );

  // the dead vat should stay dead
  c.queueToVatExport('bootstrap', 'o+0', 'run', capargs([]));
  await c.run();
  t.deepEqual(nextLog(), ['run exploded: Error: vat terminated'], 'stay dead');
});
