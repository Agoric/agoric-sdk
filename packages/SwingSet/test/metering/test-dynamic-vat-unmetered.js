/* global require */
// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
import '@agoric/install-metering-and-ses';
import bundleSource from '@agoric/bundle-source';
import test from 'ava';
import { buildVatController } from '../../src/index.js';
import makeNextLog from '../make-nextlog.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

const localOnlyForNow = { defaultManagerType: 'local' };

// Dynamic vats can be created without metering

test('unmetered dynamic vat', async t => {
  const config = {
    bootstrap: 'bootstrap',
    ...localOnlyForNow,
    vats: {
      bootstrap: {
        sourceSpec: require.resolve('./vat-load-dynamic.js'),
      },
    },
  };
  const c = await buildVatController(config, []);
  c.pinVatRoot('bootstrap');
  const nextLog = makeNextLog(c);

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // we'll give this bundle to the loader vat, which will use it to create a
  // new (unmetered) dynamic vat
  const dynamicVatBundle = await bundleSource(
    require.resolve('./metered-dynamic-vat.js'),
  );

  // 'createVat' will import the bundle
  c.queueToVatRoot(
    'bootstrap',
    'createVat',
    capargs([dynamicVatBundle, { metered: false }]),
    'panic',
  );
  await c.run();
  t.deepEqual(nextLog(), ['created'], 'first create');

  // First, send a message to the dynamic vat that runs normally
  c.queueToVatRoot('bootstrap', 'run', capargs([]), 'panic');
  await c.run();

  t.deepEqual(nextLog(), ['did run'], 'first run ok');

  // Tell the dynamic vat to call `Array(4e9)`. If metering was in place,
  // this would be rejected. Without metering, it's harmless (Arrays are
  // lazy).
  c.queueToVatRoot('bootstrap', 'explode', capargs(['allocate']), 'panic');
  await c.run();
  t.deepEqual(nextLog(), ['failed to explode'], 'metering disabled');
});
