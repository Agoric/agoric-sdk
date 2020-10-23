/* global gc WeakRef */
// 'node --expose-gc' will make Node.js add 'gc()' to the globals
// to get Ava to pass that argument, do one of:
//
// * in package.json "scripts":
//   "ava test --node-arguments '\"--expose-gc\"' test/gc/test-gc.js"
//   (except it doesn't find the test: is the filename filter additive?)
// * in package.json "ava":
//   "nodeArguments": [ "--expose-gc" ]
// * use an alternate ava config file with:
//   nodeArguments: [ '--expose-gc' ]
//   (except it doesn't find the test)

import '@agoric/install-ses';
import test from 'ava';
import path from 'path';
import bundleSource from '@agoric/bundle-source';
import { makePromiseKit } from '@agoric/promise-kit';
import { buildVatController, buildKernelBundles } from '../../src/index';

const haveGC = typeof gc === 'function' && typeof WeakRef === 'function';
const testIfGC = haveGC ? test : test.skip;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bb = await bundleSource(path.resolve(__dirname, 'bootstrap.js'));
  const btarget = await bundleSource(path.resolve(__dirname, 'vat-target.js'));
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { bundle: bb },
      target: { bundle: btarget },
    },
  };
  t.context.data = { config, kernelBundles };
});

function nextTick() {
  const pk = makePromiseKit();
  setImmediate(pk.resolve);
  return pk.promise;
}

function getDecrefSet(c) {
  return new Set(
    c.dump().pendingDecrefs.map(r => `${r.vatID}.${r.vref}=${r.count}`),
  );
}

testIfGC('basic gc', async t => {
  const { config, kernelBundles } = t.context.data;
  const c = await buildVatController(config, [], {
    kernelBundles,
    testTrackDecref: true,
  });
  await c.run();
  // vat-target has received and ignored (i.e. immediately dropped)
  // theImport, but nothing really gets freed until we force a GC sweep
  gc();
  // and because the finalizers run asynchronously, we must wait a bit
  await nextTick();
  // after one tick, the bootstrap vat's imports are dropped
  await nextTick();
  // the second tick allows vat-target's imports to be dropped

  const targetVatID = c.vatNameToID('target');
  const theImport = 'o-50'; // TODO would be nice to compute this instead
  const expected = `${targetVatID}.${theImport}=1`;
  const decrefs = getDecrefSet(c);
  // decrefs contain all the bootstrap message args that were freed, but
  // also`theImport` in vat-target, which is all we're checking for
  t.truthy(decrefs.has(expected));

  t.pass();
});
