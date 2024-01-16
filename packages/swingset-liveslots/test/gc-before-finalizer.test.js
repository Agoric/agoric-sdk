import test from 'ava';
import { Far } from '@endo/marshal';
import { kser, kslot } from '@agoric/kmarshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { buildSyscall } from './liveslots-helpers.js';
import { makeStartVat, makeMessage, makeBringOutYourDead } from './util.js';
import { makeMockGC } from './mock-gc.js';

const justGC = log =>
  log.filter(
    l =>
      l.type === 'dropImports' ||
      l.type === 'retireImports' ||
      l.type === 'retireExports',
  );

test('presence in COLLECTED state is not dropped yet', async t => {
  const { syscall, log } = buildSyscall();
  const gcTools = makeMockGC();

  // our GC terminology (see boyd-gc.js for notes):
  // * REACHABLE means userspace can reach a Presence
  // * UNREACHABLE means it cannot
  // * COLLECTED means the engine GC has noticed, so the
  //             slotToVal.get(vref) WeakRef is empty, even though
  //             slotToVal.has(vref) is still true. A finalizer
  //             callback has been queued.
  // * FINALIZED means the callback has been run. Our callback does
  //             slotToVal.delete(vref) before adding the vref to
  //             possiblyDeadSet

  // slotToVal.has() returns true for REACHABLE / UNREACHABLE /
  // COLLECTED, and false for FINALIZED. getValForSlot() is another
  // way to probe for reachability, but it also looks to see if the
  // WeakRef is full, so it returns false for both COLLECTED and
  // FINALIZED.

  // We use slotToVal.has(vref) as the "is it still reachable" probe
  // in scanForDeadObjects(), because if we have a Presence in the
  // COLLECTED state, we must not dropImports it during this BOYD. The
  // finalizer is still enqueued, so some future turn will run it, and
  // the vref will be added to possiblyDeadSet again. We want the drop
  // to happen exactly once, and we don't remove the finalizer from
  // the queue, which means the drop must happen in the future BOYD.

  // We can get into this situation with the following sequence:
  // 1: vref is held by both Presence and vdata
  // 2: Presence is dropped by userspace (->UNREACHABLE)
  // 3: userspace store.delete(), drops vdata refcount, addToPossiblyDeadSet
  // 4: organic GC happens (->COLLECTED, WeakRef is empty)
  // 5: BOYD is called (finalizer has not run yet)

  // The order of steps 3 and 4 is not important. What matters is that
  // the WeakRef is empty, but the finalizer has not yet run, at the
  // time that BOYD happens. And that the vref is in possiblyDeadSet
  // (because of the vdata drop, not the finalizer), so this BOYD will
  // examine the vref.

  // This test simulates this case with our mockGC tools. It would
  // fail if boyd-gc.js used getValForSlot instead of slotToVal.has.

  // The GC code used to call getValForSlot() instead of
  // slotToVal.has(), in the possiblyRetiredSet. The second test
  // exercises this case, and would fail if it still used
  // getValForSlot

  let myPresence;
  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { makeScalarBigMapStore } = VatData;
    const store = makeScalarBigMapStore();
    return Far('root', {
      store: p => {
        myPresence = p;
        store.init('presence', p);
      },
      drop: () => store.delete('presence'),
    });
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch } = ls;
  await dispatch(makeStartVat(kser()));

  await dispatch(makeMessage('o+0', 'store', [kslot('o-1')]));
  t.truthy(myPresence);

  // clear out everything before our check
  await dispatch(makeBringOutYourDead());
  log.length = 0;

  // drop the vdata reference
  await dispatch(makeMessage('o+0', 'drop', []));
  log.length = 0;

  // and, before BOYD can happen, collect (but do not finalize) the Presence
  gcTools.kill(myPresence);

  // now BOYD
  await dispatch(makeBringOutYourDead());

  // the BOYD must not have done dropImports or retireImports
  t.deepEqual(log, []);

  // eventually, the finalizer runs
  gcTools.flushAllFRs();

  // *now* a BOYD will drop+retire
  await dispatch(makeBringOutYourDead());
  t.deepEqual(justGC(log), [
    { type: 'dropImports', slots: ['o-1'] },
    { type: 'retireImports', slots: ['o-1'] },
  ]);
});

test('presence in COLLECTED state is not retired early', async t => {
  const { syscall, log } = buildSyscall();
  const gcTools = makeMockGC();

  // The GC code used to call getValForSlot() instead of
  // slotToVal.has(), in the possiblyRetiredSet. This test would fail
  // if it still used getValForSlot.

  // The setup is a Presence in the COLLECTED state as the only
  // pillar, but not in possiblyDeadSet, whose vref also appears in
  // possiblyRetiredSet (because a recognizer was just deleted). On
  // the BOYD that handles the possiblyRetiredSet, the "reachability
  // inhibits retirement" check should treat the COLLECTED state as
  // reachable, so the retirement is deferred for a later BOYD (which
  // would drop the vref first)
  //
  // To build this, we have an anchored (virtual) MapStore msA holding
  // the only reference (vdata) to a (virtual) WeakSetStore wssB. wssB
  // has one (weak) key, o-1, for which there is a Presence P.
  //
  // 1: Construct everything, kill the wssB Representative, BOYD. That
  //    will process wssB, but leave it alive because of the vdata in
  //    msA.

  // 2: Use msA.delete(key) to drop its vdata ref to wssB (adding wssB
  //    to possiblyDeadSet), and use gcTools.kill(P) to mock-mark it
  //    as COLLECTED (but not finalized)

  // 3: Do a BOYD. The first pass will see wssB is unreachable, and
  //    delete it. The collection deleter will put o-1 in
  //    possiblyRetiredSet. There might be a second pass (doMore=1),
  //    but it won't have anything in possiblyDeadSet and will do
  //    nothing. Then the post-deadSet loop will process
  //    possiblyRetiredSet, which will contain our o-1. That
  //    processing step contains the valToSlot.has (or the
  //    would-be-incorrect getValForSlot) that we want to exercise.

  let myPresence;
  let myWeakStore;

  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { makeScalarBigMapStore, makeScalarBigWeakSetStore } = VatData;
    const store = makeScalarBigMapStore();
    myWeakStore = makeScalarBigWeakSetStore();
    return Far('root', {
      store: p => {
        myPresence = p;
        myWeakStore.add(p);
        t.truthy(myWeakStore.has(p));
        store.init('weakstore', myWeakStore);
      },
      dropWeakStore: () => store.delete('weakstore'),
    });
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch, testHooks } = ls;
  const { possiblyDeadSet, possiblyRetiredSet, slotToVal } = testHooks;
  await dispatch(makeStartVat(kser()));

  // step 1 (setup): store, kill WeakSetStore representative, BOYD
  await dispatch(makeMessage('o+0', 'store', [kslot('o-1')]));
  t.truthy(myPresence);
  gcTools.kill(myWeakStore);
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());
  log.length = 0;

  // myPresence vref is held by the Presence, and recognized by myWeakStore
  t.is(possiblyDeadSet.size, 0);
  t.is(possiblyRetiredSet.size, 0);

  // step 2: delete vdata ref to weakstore, make myPresence COLLECTED
  await dispatch(makeMessage('o+0', 'dropWeakStore', []));
  gcTools.kill(myPresence);
  log.length = 0;
  // weakstore is possiblyDead (NARRATORS VOICE: it's dead). Presence
  // is not, because the finalizer hasn't run.
  t.is(possiblyDeadSet.size, 1);
  t.is(possiblyRetiredSet.size, 0);
  t.not([...possiblyDeadSet][0], 'o-1');
  // the empty weakref is still there
  t.true(slotToVal.has('o-1'));

  // step 3: BOYD. It will collect myWeakStore on the first pass,
  // whose deleter should clear all entries, which will add its
  // recognized vrefs to possiblyRetiredSet. The post-pass will check
  // o-1 for reachability with slotToVal.has, and because that says it
  // is reachable, it will not be retired (even though it has no
  // recognizer by now).
  //
  // *If* scanForDeadObjects() were mistakenly using getValForSlot()
  // *instead of slotToVal.has(), we would see a retireImports here,
  // *which would be a vat-fatal error, because we haven't seen a
  // *dropImports yet.
  await dispatch(makeBringOutYourDead());
  // I tested this manually, by modifying boyd-gc.js *to use
  // getValForSlot, and observed that this deepEqual(justGC(log), [])
  // failed: it had an unexpected retireImports
  t.deepEqual(justGC(log), []);
  log.length = 0;

  // eventually, the finalizer runs
  gcTools.flushAllFRs();

  // *now* a BOYD will drop+retire
  await dispatch(makeBringOutYourDead());
  t.deepEqual(justGC(log), [
    { type: 'dropImports', slots: ['o-1'] },
    { type: 'retireImports', slots: ['o-1'] },
  ]);
});
