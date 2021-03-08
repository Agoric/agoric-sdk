/* global require */
// eslint-disable-next-line import/order
import { replaceGlobalMeter } from './install-global-metering';
import '@agoric/install-ses';
import { assert, details as X } from '@agoric/assert';
import bundleSource from '@agoric/bundle-source';
import { importBundle } from '@agoric/import-bundle';
import { makeMeter, makeMeteringTransformer } from '@agoric/transform-metering';
import * as babelCore from '@babel/core';
import re2 from 're2';
import test from 'ava';
import { waitUntilQuiescent } from '../../src/waitUntilQuiescent';

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
    // eslint-disable-next-line no-empty
  } catch (_e) {}
  await waitUntilQuiescent();
  replaceGlobalMeter(null); // disable global metering
  if (meter.isExhausted()) {
    // console.log(`meter is exhausted`);
    // throw Error("meter exhausted");
    return false;
  }
  // console.log(`meter is ok`);
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
    // const newRegExp = ss.endowments.RegExp; // === re2
    return ss.src;
  }

  // Must importBundle under the meter, because top-level code runs, and
  // might run forever. It might also spawn off Promise callbacks, and we
  // don't want to let those escape the meter either.
  let ns;
  // importBundle requires a 'require', even if nothing uses it
  function doImport() {
    const p = importBundle(bundle, {
      endowments: { ...endowments, getMeter, RegExp: re2 },
      transforms: [transform],
    });
    p.then(n => (ns = n));
  }
  // this throws if top-level code exhausts meter
  const topLevelOk = await runUnderMeter(meter, doImport);
  assert(topLevelOk, X`top-level code exhausted the meter`);
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

test('metering a single bundle', async function testSingleBundle(t) {
  const bundle = await bundleSource(require.resolve('./metered-code.js'));
  harden(Object.getPrototypeOf(console));
  const endowments = { console, assert };
  const {
    ns,
    runBundleThunkUnderMeter,
    refillFacet,
  } = await meteredImportBundle(bundle, endowments);

  const log2 = [];
  const meterMe = ns.meterMe;
  // console.log(`running without explosion`);
  let ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'no'));
  t.deepEqual(log2, ['started', 'done'], 'computation completed');
  log2.splice(0);
  t.is(ok, true, 'meter should not be exhausted');

  ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'compute'));
  t.deepEqual(log2, ['started'], 'computation started but halted');
  log2.splice(0);
  t.is(ok, false, 'meter should be exhausted (compute)');

  // Run the same code (without an infinite loop) against the old exhausted
  // meter. It should halt right away.
  ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'no'));
  t.is(log2.length, 0, 'computation did not start');
  t.is(ok, false, 'meter should be exhausted (still compute)');

  // Refill the meter, and the code should run again.
  // refillFacet.combined(10000000);
  // refillFacet.allocate(10000000);
  refillFacet.compute(10000000);
  ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'no'));
  t.deepEqual(log2, ['started', 'done'], 'computation completed');
  log2.splice(0);
  t.is(ok, true, 'meter should not be exhausted');

  // now check that metering catches infinite stack
  ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'stack'));
  t.deepEqual(log2, ['started'], 'computation started but halted');
  log2.splice(0);
  t.is(ok, false, 'meter should be exhausted (stack)');

  // Refill the meter, and the code should run again.
  // refillFacet.combined(10000000);
  // refillFacet.allocate(10000000);
  refillFacet.stack(10000000);
  ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'no'));
  t.deepEqual(log2, ['started', 'done'], 'computation completed');
  log2.splice(0);
  t.is(ok, true, 'meter should not be exhausted');

  // metering should catch primordial allocation too
  ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'allocate'));
  t.deepEqual(log2, ['started'], 'computation started but halted');
  log2.splice(0);
  t.is(ok, false, 'meter should be exhausted (allocate)');

  // Refill the meter, and the code should run again.
  refillFacet.allocate(10000000);
  ok = await runBundleThunkUnderMeter(() => meterMe(log2, 'no'));
  t.deepEqual(log2, ['started', 'done'], 'computation completed');
  log2.splice(0);
  t.is(ok, true, 'meter should not be exhausted');
});
