import test from 'ava';
import { Far } from '@endo/marshal';
import { kser } from '@agoric/kmarshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { buildSyscall } from './liveslots-helpers.js';
import { makeStartVat } from './util.js';
import { makeMockGC } from './mock-gc.js';

test('droppedCollectionWeakRefs', async t => {
  const { syscall } = buildSyscall();
  const gcTools = makeMockGC();
  let myVOAwareWeakMap;
  let myVOAwareWeakSet;

  // In XS, WeakRefs are treated as strong references except for
  // forced GC, which reduces our sensitivity to GC timing (which is
  // more likely to change under small upgrades of the engine). We'd
  // like this improvement for objects tracked by
  // FinalizationRegistries too. Liveslots has two FRs,
  // `vreffedObjectRegistry` (whose entries all have WeakRefs in
  // slotToVal), and `droppedCollectionRegistry` (in the VRM).
  //
  // `droppedCollectionRegistry` tracks the VO-aware replacements for
  // WeakMap/Set that we impose on userspace, and these do not have
  // vref identities, so they will never appear in slotToVal or
  // valToSlot, so we need to create new WeakRefs to trigger the
  // retain-under-organic-GC behavior. Those WeakRefs are held in the
  // FR context/"heldValue" until it fires.

  function buildRootObject(vatPowers) {
    const { WeakMap, WeakSet } = vatPowers;
    // creating a WeakMap/Set should put it in droppedCollectionWeakRefs
    myVOAwareWeakMap = new WeakMap();
    myVOAwareWeakSet = new WeakSet();
    return Far('root', {});
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch, testHooks } = ls;
  await dispatch(makeStartVat(kser()));

  const wmWeakRef = gcTools.weakRefFor(myVOAwareWeakMap);
  const wsWeakRef = gcTools.weakRefFor(myVOAwareWeakSet);

  // we snoop inside our mock FinalizationRegistry to get the context
  const fr = testHooks.getDroppedCollectionRegistry();
  t.is(fr.registry.get(myVOAwareWeakMap).wr, wmWeakRef);
  t.is(fr.registry.get(myVOAwareWeakSet).wr, wsWeakRef);

  gcTools.kill(myVOAwareWeakMap);
  gcTools.flushAllFRs();
  t.falsy(fr.registry.has(myVOAwareWeakMap));
  t.truthy(fr.registry.has(myVOAwareWeakSet)); // not dead yet

  gcTools.kill(myVOAwareWeakSet);
  gcTools.flushAllFRs();
  t.falsy(fr.registry.has(myVOAwareWeakMap));
  t.falsy(fr.registry.has(myVOAwareWeakSet)); // dead now
});
