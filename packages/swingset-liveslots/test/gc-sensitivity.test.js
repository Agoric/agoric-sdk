// @ts-nocheck
import test from 'ava';
import { Far } from '@endo/marshal';
import { kser } from '@agoric/kmarshal';
import { buildSyscall } from './liveslots-helpers.js';
import { makeLiveSlots } from '../src/liveslots.js';
import { makeMockGC } from './mock-gc.js';
import { makeMessage, makeStartVat } from './util.js';

test.failing('kind handle reanimation', async t => {
  const { syscall, log } = buildSyscall();
  const gcTools = makeMockGC();

  function buildRootObject(vatPowers, vatParameters, baggage) {
    const { VatData } = vatPowers;
    const kh0 = VatData.makeKindHandle('kh');
    VatData.defineDurableKind(kh0, () => ({}), {});
    baggage.init('kh', kh0);

    const root = Far('root', {
      fetch1() {
        // console.log(`--fetch1`);
        baggage.get('kh');
      },
      gc() {
        // console.log(`--gc`);
        gcTools.kill(kh0);
        gcTools.flushAllFRs();
      },
      fetch2() {
        // console.log(`--fetch2`);
        baggage.get('kh');
      },
    });
    return root;
  }

  const rootA = 'o+0';
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject,
  }));
  const { dispatch } = ls;
  await dispatch(makeStartVat(kser()));

  // Imagine a vat which allocates a KindID for 'kh', and stores it in
  // baggage, and then drops the Representative (the Handle). Then
  // time passes, during which GC may or may not happen, and then the
  // vat pulls 'kh' out of baggage.

  log.length = 0;
  // this simulates the GC-did-not-happen case: the kh0 Representative
  // is still around from buildRootObject (liveslots has not seen the
  // FinalizationRegistry fire, and the WeakRef is still populated)
  await dispatch(makeMessage(rootA, 'fetch1', []));
  const noGCLog = [...log];
  log.length = 0;

  // this simulates the GC-did-happen case: liveslots has seen kh0
  // die, so it must reanimate a new one
  await dispatch(makeMessage(rootA, 'gc', []));
  log.length = 0;
  await dispatch(makeMessage(rootA, 'fetch2', []));
  const yesGCLog = [...log];
  log.length = 0;

  // we need the syscall behavior of both cases to be the same
  t.deepEqual(noGCLog, yesGCLog);
});

test('representative reanimation', async t => {
  const { syscall, log } = buildSyscall();
  const gcTools = makeMockGC();

  function buildRootObject(vatPowers, vatParameters, baggage) {
    const { VatData } = vatPowers;
    const kh0 = VatData.makeKindHandle('kh');
    const behavior = { get: ({ state }) => state.data };
    const initState = { data: 0 };
    const make = VatData.defineDurableKind(kh0, () => initState, behavior);
    const r0 = make();
    baggage.init('k', r0);
    const r1 = make();
    // knock r0.innerSelf out of the cache, leave only r1
    make();
    r1.get();

    const root = Far('root', {
      fetch1() {
        // console.log(`--fetch1`);
        baggage.get('k');
      },
      gc() {
        // console.log(`--gc`);
        gcTools.kill(r0);
        gcTools.flushAllFRs();
        // knock r0.innerSelf out of the cache, leave only r1
        make();
        r1.get();
      },
      fetch2() {
        // console.log(`--fetch2`);
        baggage.get('k');
      },
    });
    return root;
  }

  const rootA = 'o+0';
  const opts = { virtualObjectCacheSize: 0 };
  const ls = makeLiveSlots(
    syscall,
    'vatA',
    {},
    opts,
    gcTools,
    undefined,
    () => ({
      buildRootObject,
    }),
  );
  const { dispatch } = ls;
  await dispatch(makeStartVat(kser()));

  // Imagine a vat which creates an initial Representative of some
  // Kind and stores it in baggage, then drops the Representative (the
  // Handle). Then time passes, during which GC may or may not happen,
  // and then the vat pulls it back out of baggage.

  log.length = 0;
  // this simulates the GC-did-not-happen case: the r0 Representative
  // is still around from buildRootObject (liveslots has not seen the
  // FinalizationRegistry fire, and the WeakRef is still populated)
  await dispatch(makeMessage(rootA, 'fetch1', []));
  const noGCLog = [...log];
  log.length = 0;

  // this simulates the GC-did-happen case: liveslots has seen r0 die,
  // so it must reanimate a new one
  await dispatch(makeMessage(rootA, 'gc', []));
  log.length = 0;
  await dispatch(makeMessage(rootA, 'fetch2', []));
  const yesGCLog = [...log];
  log.length = 0;

  // we need the syscall behavior of both cases to be the same
  t.deepEqual(noGCLog, yesGCLog);
});

test('collection reanimation', async t => {
  const { syscall, log } = buildSyscall();
  const gcTools = makeMockGC();

  function buildRootObject(vatPowers, vatParameters, baggage) {
    const { VatData } = vatPowers;
    const c0 = VatData.makeScalarBigMapStore('c', { durable: true });
    baggage.init('c', c0);

    const root = Far('root', {
      fetch1() {
        // console.log(`--fetch1`);
        baggage.get('c');
      },
      gc() {
        // console.log(`--gc`);
        gcTools.kill(c0);
        gcTools.flushAllFRs();
      },
      fetch2() {
        // console.log(`--fetch2`);
        baggage.get('c');
      },
    });
    return root;
  }

  const rootA = 'o+0';
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject,
  }));
  const { dispatch } = ls;
  await dispatch(makeStartVat(kser()));

  // Imagine a vat which creates a durable collection 'c0' and stores
  // it in baggage, and then drops the Representative. Then time
  // passes, during which GC may or may not happen, and then the vat
  // pulls 'c' out of baggage.

  log.length = 0;
  // this simulates the GC-did-not-happen case: the c0 Representative
  // is still around from buildRootObject (liveslots has not seen the
  // FinalizationRegistry fire, and the WeakRef is still populated)
  await dispatch(makeMessage(rootA, 'fetch1', []));
  const noGCLog = [...log];
  log.length = 0;

  // this simulates the GC-did-happen case: liveslots has seen c0
  // die, so it must reanimate a new one
  await dispatch(makeMessage(rootA, 'gc', []));
  log.length = 0;
  await dispatch(makeMessage(rootA, 'fetch2', []));
  const yesGCLog = [...log];
  log.length = 0;

  // we need the syscall behavior of both cases to be the same
  t.deepEqual(noGCLog, yesGCLog);
});
