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
const testIfGC = haveGC ? test.serial : test.skip;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bboot = await bundleSource(path.resolve(__dirname, 'boot.js'));
  const bterm = await bundleSource(path.resolve(__dirname, 'boot-term.js'));
  const btarget = await bundleSource(path.resolve(__dirname, 'vat-target.js'));
  const baseConfig = {
    bundles: {
      target: {
        bundle: btarget,
      },
    },
    vats: {
      bootstrap: { bundle: bboot },
      bootstrapTerminate: { bundle: bterm },
      target: { bundle: btarget },
    },
  };
  t.context.data = { baseConfig, kernelBundles };
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
  const { baseConfig, kernelBundles } = t.context.data;
  const config = { ...baseConfig, bootstrap: 'bootstrap' };
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

testIfGC('decref on terminated vat', async t => {
  const { baseConfig, kernelBundles } = t.context.data;
  const config = { ...baseConfig, bootstrap: 'bootstrapTerminate' };
  const c = await buildVatController(config, [], {
    kernelBundles,
    testTrackDecref: true,
  });
  // this creates a dynamic vat, with the same code as above
  await c.run();

  function capargs(args, slots = []) {
    return harden({ body: JSON.stringify(args), slots });
  }
  function send(name) {
    c.queueToVatExport('bootstrapTerminate', 'o+0', name, capargs([]), 'panic');
  }

  // We want to make sure the kernel decref() function can tolerate a late
  // decref message that names a vat which is no longer present. If the test
  // can finish without crashing, we're probably good. Like all
  // non-deterministic things, this doesn't always exercise the bug:
  // sometimes the decref arrives before the vat has been removed, and
  // sometimes the vat (and the FinalizationRegistry) is destroyed before the
  // decref is generated. This sequence seems to yield a 50% hit rate.

  send('ignore');
  await c.run();
  gc();
  send('terminate');
  await c.run();
  await nextTick();
  await nextTick();

  // The dynamic-vat decref (typically v8.o-50) only appears in decrefs if it
  // arrives before the vat is terminated, which is the opposite of the case
  // we're trying to test. In the ~50% of cases that decref() *after* the vat
  // is terminated, decref() ignores the call, so it doesn't show up in the
  // list. As a result, this tests passes if it completes without exceptions.
  t.pass();
});
