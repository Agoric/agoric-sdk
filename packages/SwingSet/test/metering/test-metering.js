/* global harden replaceGlobalMeter */
import { replaceGlobalMeter } from './install-global-metering.js';
import '@agoric/install-ses';
import { assert } from '@agoric/assert';
import bundleSource from '@agoric/bundle-source';
import { waitUntilQuiescent } from '../../src/waitUntilQuiescent';
import { importBundle } from '@agoric/import-bundle';
import { makeMeter, makeMeteringTransformer, makeMeteredEvaluator } from '@agoric/transform-metering';
import * as babelCore from '@babel/core';
import re2 from 're2';
import tap from 'tap';

// Run a function under the control of a meter. The function must not have
// access to the timer queue (setImmediate or setInterval). Returns a Promise
// that fires when the function no longer has agency. The Promise rejects
// (with Error("meter exhausted") if the meter was exhausted, or resolves to
// undefined if the thunk finished normally. In either case, the thunk no
// longer has agency. The success/failure behavior of the thunk is discarded.
// Needs waitUntilQuiescent to work (which uses setImmediate itself).
async function runUnderMeter(meter, thunk) {
  replaceGlobalMeter(meter); // also turn on global metering
  try {
    thunk();
  } catch (_e) {
  }
  await waitUntilQuiescent();
  replaceGlobalMeter(null); // disable global metering
  if (meter.isExhausted()) {
    console.log(`meter is exhausted`);
    //throw Error("meter exhausted");
    return false;
  }
  console.log(`meter is ok`);
  return true;
}

async function meteredImportBundle(bundle, endowments) {
  const { meter, refillFacet } = makeMeter();
  function getMeter() {
    return meter;
  }

  // ss = mt.rewrite(ss)
  // where ss is { src, endowments }
  // and endowments.getMeter() works: it can be billed for the source being transformed
  // but endowments.getMeter() is allowed to return falsy

  // and endowments.RegExp will be set during transformation
  // also 'makeMeteringTransformer' must be imported in the start compartment, so
  // it can import RE2 (which has native code). we'll have to pass 'mt' from the
  // controller into the kernel, so the kernel can create dynamic vats. We can also
  // pass it into static vats, so within-vat metering can happen.

  const mt = makeMeteringTransformer(babelCore);
  function transform(src) {
    const ss = mt.rewrite({ src, endowments: { getMeter } });
    //const newRegExp = ss.endowments.RegExp; // === re2
    return ss.src;
  }

  // Must importBundle under the meter, because top-level code runs, and
  // might run forever. It might also spawn off Promise callbacks, and we
  // don't want to let those escape the meter either.
  let ns;
  // importBundle requires a 'require', even if nothing uses it
  function doImport() {
    const p = importBundle(bundle, {
      endowments: { ...endowments,
                    require: what => 0,
                    getMeter, RegExp: re2 },
      transforms: [transform],
    });
    p.then(n => ns = n);
  }
  // this throws if top-level code exhausts meter
  const topLevelOk = await runUnderMeter(meter, doImport);
  if (!topLevelOk) {
    throw Error(`top-level code exhausted the meter`);
  }
  assert(ns, 'bundle failed to produce namespace object before quiesence');

  function runBundleThunkUnderMeter(thunk) {
    return runUnderMeter(meter, thunk);
  }

  return {
    ns,
    runBundleThunkUnderMeter,
    refillFacet,
  };
}


tap.test('metering a single bundle', async function(t) {
  const bundle = await bundleSource(require.resolve('./metered-code.js'),
                                    'nestedEvaluate');
  harden(console.__proto__);
  const endowments = { console };
  const { ns, runBundleThunkUnderMeter, refillFacet } =
        await meteredImportBundle(bundle, endowments);

  const log = [];
  const meterMe = ns.default;
  //console.log(`running without explosion`);
  let ok = await runBundleThunkUnderMeter(() => meterMe(log, 'no'));
  t.equal(log.length, 1, 'computation got started');
  log.splice(0);
  t.equal(ok, true, 'meter should not be exhausted');

  ok = await runBundleThunkUnderMeter(() => meterMe(log, 'compute'));
  t.equal(log.length, 1, 'computation got started');
  log.splice(0);
  t.equal(ok, false, 'meter should be exhausted (compute)');

  // Run the same code (without an infinite loop) against the old exhausted
  // meter. It should halt right away.
  ok = await runBundleThunkUnderMeter(() => meterMe(log, 'no'));
  t.equal(log.length, 0, 'computation did not start');
  t.equal(ok, false, 'meter should be exhausted (still compute)');

  // Refill the meter, and the code should run again.
  //refillFacet.combined(10000000);
  //refillFacet.allocate(10000000);
  refillFacet.compute(10000000);
  ok = await runBundleThunkUnderMeter(() => meterMe(log, 'no'));
  t.equal(log.length, 1, 'computation got started');
  log.splice(0);
  t.equal(ok, true, 'meter should not be exhausted');

  // now check that metering catches infinite stack
  ok = await runBundleThunkUnderMeter(() => meterMe(log, 'stack'));
  t.equal(log.length, 1, 'computation got started');
  log.splice(0);
  t.equal(ok, false, 'meter should be exhausted (stack)');

  // Refill the meter, and the code should run again.
  //refillFacet.combined(10000000);
  //refillFacet.allocate(10000000);
  refillFacet.stack(10000000);
  ok = await runBundleThunkUnderMeter(() => meterMe(log, 'no'));
  t.equal(log.length, 1, 'computation got started');
  log.splice(0);
  t.equal(ok, true, 'meter should not be exhausted');

  // metering should catch primordial allocation too
  ok = await runBundleThunkUnderMeter(() => meterMe(log, 'allocate'));
  t.equal(log.length, 1, 'computation got started');
  log.splice(0);
  t.equal(ok, false, 'meter should be exhausted (allocate)');

  // Refill the meter, and the code should run again.
  refillFacet.allocate(10000000);
  ok = await runBundleThunkUnderMeter(() => meterMe(log, 'no'));
  t.equal(log.length, 1, 'computation got started');
  log.splice(0);
  t.equal(ok, true, 'meter should not be exhausted');

});
