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

// This test checks that dynamic vats (which are metered) can import bundles,
// and that those bundles are also metered.

test('metering dynamic vat which imports bundle', async t => {
  // We first create a static vat with vat-load-dynamic.js
  const config = {
    bootstrap: 'bootstrap',
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

  // now we tell the static vat to create a dynamic vat, from
  // metered-dynamic-vat.js
  const dynamicVatBundle = await bundleSource(
    require.resolve('./metered-dynamic-vat.js'),
  );

  // 'createVat' will import the bundle
  const cvopts = { metered: true };
  const cvargs = capargs([dynamicVatBundle, cvopts]);
  c.queueToVatRoot('bootstrap', 'createVat', cvargs);
  await c.run();
  t.deepEqual(nextLog(), ['created'], 'first create');

  // then we tell the dynamic vat to load the grandchild.js bundle
  const grandchildBundle = await bundleSource(
    require.resolve('./grandchild.js'),
  );
  const r = c.queueToVatRoot('bootstrap', 'load', capargs([grandchildBundle]));
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs('ok'));

  // First, send a message to the grandchild that runs normally
  c.queueToVatRoot('bootstrap', 'bundleRun', capargs([]));
  await c.run();

  t.deepEqual(nextLog(), ['did run'], 'first run ok');

  // Now tell the grandchild to exhaust the dynamic vat's meter. The message
  // result promise should be rejected, and the control facet should report
  // the vat's demise
  c.queueToVatRoot('bootstrap', 'bundleExplode', capargs(['allocate']));
  await c.run();

  t.deepEqual(
    nextLog(),
    [
      'did explode: Error: vat terminated',
      'terminated: Error: Allocate meter exceeded',
    ],
    'grandchild go boom',
  );

  // the whole vat should be dead (we use 'run' instead of 'bundleRun')
  c.queueToVatRoot('bootstrap', 'run', capargs([]));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run exploded: Error: vat terminated'],
    'whole dynamic vat is dead',
  );
});
