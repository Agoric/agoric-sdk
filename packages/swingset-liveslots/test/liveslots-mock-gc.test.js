// @ts-nocheck
import test from 'ava';

import { Far } from '@endo/marshal';
import { kslot, kser } from '@agoric/kmarshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { parseVatSlot } from '../src/parseVatSlots.js';
import { buildSyscall } from './liveslots-helpers.js';
import {
  makeMessage,
  makeStartVat,
  makeBringOutYourDead,
  makeResolve,
  makeRetireImports,
} from './util.js';
import { makeMockGC } from './mock-gc.js';

test('dropImports', async t => {
  const { syscall } = buildSyscall();
  const imports = [];
  const gcTools = makeMockGC();

  function build(_vatPowers) {
    const root = Far('root', {
      hold(imp) {
        imports.push(imp);
      },
      free() {
        gcTools.kill(imports.pop());
      },
      ignore(imp) {
        gcTools.kill(imp);
      },
    });
    return root;
  }

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject: build,
  }));
  const { dispatch, testHooks } = ls;
  const { possiblyDeadSet } = testHooks;
  await dispatch(makeStartVat(kser()));
  const allFRs = gcTools.getAllFRs();
  t.is(allFRs.length, 2);
  const FR = allFRs[0];

  const rootA = 'o+0';

  // immediate drop should push import to possiblyDeadSet after finalizer runs
  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-1')]));
  // the immediate gcTools.kill() means that the import should now be in the
  // "COLLECTED" state
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-1']));
  possiblyDeadSet.delete('o-1'); // pretend liveslots did syscall.dropImport

  // separate hold and free should do the same
  await dispatch(makeMessage(rootA, 'hold', [kslot('o-2')]));
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);
  await dispatch(makeMessage(rootA, 'free', []));

  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);
  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-2']));
  possiblyDeadSet.delete('o-2'); // pretend liveslots did syscall.dropImport

  // re-introduction during COLLECTED should return to REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-3')]));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'hold', [kslot('o-3')]));
  // back to REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // stays at REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());

  await dispatch(makeMessage(rootA, 'free', []));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-3']));
  possiblyDeadSet.delete('o-3'); // pretend liveslots did syscall.dropImport

  // multiple queued finalizers are idempotent, remains REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-4')]));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-4')]));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 2);

  await dispatch(makeMessage(rootA, 'hold', [kslot('o-4')]));
  // back to REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 2);

  FR.runOneCallback(); // stays at REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // stays at REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);

  // multiple queued finalizers are idempotent, remains FINALIZED

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-5')]));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-5')]));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 2);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-5']));
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // stays at FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-5']));
  t.is(FR.countCallbacks(), 0);
  possiblyDeadSet.delete('o-5'); // pretend liveslots did syscall.dropImport

  // re-introduction during FINALIZED moves back to REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-6')]));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-6']));
  t.is(FR.countCallbacks(), 0);

  await dispatch(makeMessage(rootA, 'hold', [kslot('o-6')]));
  await dispatch(makeBringOutYourDead());
  // back to REACHABLE, removed from possiblyDeadSet
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);
});

test('retention counters', async t => {
  const { syscall } = buildSyscall();
  let held;
  const gcTools = makeMockGC();

  function buildRootObject(_vatPowers) {
    const root = Far('root', {
      hold(imp) {
        held = imp;
      },
      exportRemotable() {
        return Far('exported', {});
      },
    });
    return root;
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch, testHooks } = ls;
  const { getRetentionStats } = testHooks;

  const rootA = 'o+0';
  const presenceVref = 'o-1';
  const promiseVref = 'p-1';
  const resultVref = 'p-2';

  await dispatch(makeStartVat(kser()));
  const count1 = await dispatch(makeBringOutYourDead());
  t.deepEqual(count1, getRetentionStats());
  t.is(count1.importedVPIDs, 0);
  t.is(count1.exportedRemotables, 1);
  t.is(count1.kernelRecognizableRemotables, 1);

  await dispatch(makeMessage(rootA, 'hold', [kslot(presenceVref)]));
  t.truthy(held);

  const count2 = await dispatch(makeBringOutYourDead());
  t.is(count2.slotToVal, count1.slotToVal + 1);

  gcTools.kill(held);
  gcTools.flushAllFRs();
  const count3 = await dispatch(makeBringOutYourDead());
  t.is(count3.slotToVal, count2.slotToVal - 1);

  await dispatch(makeMessage(rootA, 'hold', [kslot(promiseVref)]));
  const count4 = await dispatch(makeBringOutYourDead());
  t.is(count4.slotToVal, count3.slotToVal + 1);
  t.is(count4.importedVPIDs, 1);

  await dispatch(makeResolve(promiseVref, kser(undefined)));
  const count5 = await dispatch(makeBringOutYourDead());
  t.is(count5.slotToVal, count4.slotToVal - 1);
  t.is(count5.importedVPIDs, 0);

  await dispatch(makeMessage(rootA, 'exportRemotable', [], resultVref));
  const count6 = await dispatch(makeBringOutYourDead());
  t.is(count6.exportedRemotables, 2);
  t.is(count6.kernelRecognizableRemotables, 2);
  t.is(count6.slotToVal, count5.slotToVal + 1);
});

const doublefreetest = test.macro(async (t, mode) => {
  // A and B are virtual objects. RAM holds Representatives for
  // each. A holds a virtual (.state) reference to B. Both A and B
  // Representatives are finalized in the same crank. A's baseref
  // sorts lexicographically earlier than B.
  //
  // Previously, both A and B's baserefs appear in deadSet together,
  // and the first loop through scanForDeadObjects processes A first,
  // which gets deleted. While deleting it, we drop the virtual ref to
  // B, *which adds B back to possiblyDeadSet*. Then we process B and
  // delete B. Then scanForDeadObjects does a second loop, which sees
  // B in possiblyDeadSet, sees no slotToVal for it (not reintroduced
  // since finalization), promotes it to deadSet, then deletes it a
  // second time. When B is a collection, this used to be silently
  // ignored because allCollectionObjIDs was consulted, inhibiting the
  // duplicate deletion. With that removed, B is deleted twice, which
  // fails.

  const { syscall, fakestore } = buildSyscall();
  const gcTools = makeMockGC();

  const initData = () => ({ value: 0 });
  const behavior = { set: ({ state }, value) => (state.value = value) };
  const things = {};
  const thingNames = [
    'object1',
    'object2',
    'collection3',
    'collection4',
    'object5',
    'object6',
  ];
  let fromThing;
  let toThing;
  // eslint-disable-next-line no-unused-vars
  let fromName;
  // eslint-disable-next-line no-unused-vars
  let toName;

  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { defineKind, makeScalarBigMapStore } = VatData;

    const { firstType, lastType, order } = mode;

    // We need 2*2*2 combinations of:
    // * firstType: A is virtual [object, collection]
    // * lastType: B is virtual [object, collection]
    // * order (first->last/last->first): A.vref < B.vref , A.vref > B.vref

    // KindIDs share a numberspace with nextObjectID, for which o+0 is
    // used for the root object. KindID=1 is used for KindHandles,
    // then collection types claim 2-9 (2 is scalarMapStore, 6 is
    // scalarDurableMapStore, 9 is scalarDurableWeakSetStore). These
    // claims happen early, before buildRootObject runs.

    // Instances of the collection then get vrefs of o+vNN/MM or
    // o+dNN/MM, where 'v' and 'd' indicate virtual/durability (the +v
    // vs +d lets the kernel delete merely-virtual data without
    // needing to ask liveslots which vrefs are virtual and which are
    // durable), NN is the type, and MM is the next collectionID (a
    // space which starts at 1, and increments for every collection
    // created, regardless of type). MM=1 is claimed by baggage, which
    // gets o+d6/1, because type=6 is scalarDurableMapStore. MM=2/3/4
    // are claimed by the watched-promise tables.

    // The vrefs of virtual objects are o+vNN/PP, where NN is
    // allocated from the nextObjectID space, which typically starts
    // at 10 (since 2-9 were claimed for collection types), and PP is
    // a separate counter for each kind (starting at 1). Durable
    // objects get o+dNN/PP .

    // So the first userspace-created scalarMapStore will get o+v2/MM,
    // a scalarDurableMapStore will get o+d6/MM, the first
    // userspace-created virtual kind's first instance will get
    // o+v10/1, and a subsequent durable kind's instance will get
    // o+d11/1.

    // To get vrefs that have a specific lexicographic ordering, and
    // are also suitable for establishing virtual-data refcounts in
    // the right directions, we must abuse the ordering rules (which
    // would not be possible if we used numerical ordering instead of
    // lexicographic). We create a virtual kind first, which gets
    // KindID=10, and two instances 'object1' (o+v10/1) and 'object2'
    // (o+v10/2). Then we make two scalarMapStores, 'collection3'
    // (o+v2/5) and 'collection4' (o+v2/6). Then we create a dozen
    // throwaway Kinds, enough to reach KindID=22, and make two
    // instances of the last one, 'object5' (o+v22/1) and 'object6'
    // (o+v22/2). The total set of vrefs is thus sorted:
    //
    // * o+v10/1   object1
    // * o+v10/2   object2
    // * o+v2/5    collection3
    // * o+v2/6    collection4
    // * o+v22/1   object5
    // * o+v22/2   object6
    //
    // and we can use A->B with object1->collection3 or
    // collection3->object5 to get the desired reference-edge
    // orientations
    //
    // This is, of course, highly dependent upon the IDs assigned by
    // liveslots to scalarMapStore, and the number of allocations
    // (which controls our starting point of "10"). The test code
    // compares all the vrefs against each other to ensure we're
    // getting the lexicographic ordering that we expect.

    // The specific failing case was: o+d11/1 -> o+d6/8, which
    // corresponds to our object1->collection3 case.

    // kind10 instances will be o+v10/MM
    const makeKind10 = defineKind('kind10', initData, behavior);
    things.object1 = makeKind10(); // o+v10/1
    things.object2 = makeKind10(); // o+v10/2

    things.collection3 = makeScalarBigMapStore('collection3'); // o+v2/5
    things.collection4 = makeScalarBigMapStore('collection4'); // o+v2/6

    // consume KindIDs 11 to 21
    for (let i = 11; i < 22; i += 1) {
      defineKind(`kind${i}`, initData, behavior);
    }

    // kind22 instances will be o+v22/MM
    const makeKind22 = VatData.defineKind('kind22', initData, behavior);
    things.object5 = makeKind22(); // o+v22/1
    things.object6 = makeKind22(); // o+v22/2

    // all six Representatives have a RAM pillar now, until we use
    // mockGC to drop them

    // things.object1.set(things.collection3); // vdata ref A -> B
    // return Far('root', {});

    let firstName;
    let lastName;
    for (const name of thingNames) {
      if (!firstName) {
        // discard everything until we find a match for the first name
        if (name.startsWith(firstType)) {
          firstName = name;
        }
        continue;
      }
      if (!lastName) {
        // then do the same for the last name
        if (name.startsWith(lastType)) {
          lastName = name;
        }
        continue;
      }
    }

    const firstThing = things[firstName];
    const lastThing = things[lastName];
    let fromType;
    switch (order) {
      case 'first->last':
        [fromThing, toThing] = [firstThing, lastThing];
        [fromName, toName] = [firstName, lastName];
        fromType = firstType;
        break;
      case 'last->first':
        [fromThing, toThing] = [lastThing, firstThing];
        [fromName, toName] = [lastName, firstName];
        fromType = lastType;
        break;
      default:
        throw Error(`unknown order ${order}`);
    }
    if (fromType === 'object') {
      fromThing.set(toThing);
    } else {
      fromThing.init('key', toThing);
    }

    return Far('root', {});
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch, testHooks } = ls;
  const { valToSlot } = testHooks;

  await dispatch(makeStartVat(kser()));

  // for (const key of Array.from(fakestore.keys()).sort()) {
  //   console.log(key.padEnd(25, ' '), '->', fakestore.get(key));
  // }
  // console.log();

  const vrefs = {};
  const compares = [];
  for (const [name, compare] of Object.entries(things)) {
    const vref = valToSlot.get(compare);
    // console.log(name, compare, vref);
    vrefs[name] = vref;
    compares.push(vref.padEnd(10, ' ') + name);
  }

  // Make sure the allocated object IDs sort as we need them to. If
  // this fails, maybe liveslots is allocating so many built-in
  // collections/types that scalarDurableMapStore no longer has an ID
  // that sorts between our early Kinds and our later Kinds.
  const sortedCompares = [...compares].sort();
  t.deepEqual(compares, sortedCompares);
  // for (const s of sortedCompares) { console.log(s); }

  // console.log(`${fromName} -> ${toName}`);

  // now pretend all RAM pillars are dropped
  for (const thing of Object.values(things)) {
    gcTools.kill(thing);
  }
  gcTools.flushAllFRs();
  // the bug caused BOYD (in scanForDeadObjects) to perform a
  // double-free of lastThing, causing this to throw
  await dispatch(makeBringOutYourDead());

  for (const [name, vref] of Object.entries(vrefs)) {
    // everything should be deleted
    if (name.startsWith('object')) {
      t.is(fakestore.get(`vom.${vref}`), undefined);
      t.is(fakestore.get(`vom.rc.${vref}`), undefined);
      t.is(fakestore.get(`vom.es.${vref}`), undefined);
    } else {
      // all collection metadata should be gone
      const collectionID = String(parseVatSlot(vref).subid);
      t.is(fakestore.get(`vc.${collectionID}.|schemata`), undefined);
      t.is(fakestore.get(`vc.${collectionID}.|nextOrdinal`), undefined);
      t.is(fakestore.get(`vc.${collectionID}.|entryCount`), undefined);
    }
  }
});

for (const firstType of ['object', 'collection']) {
  for (const lastType of ['object', 'collection']) {
    for (const order of ['first->last', 'last->first']) {
      const name = `double-free ${firstType} ${lastType} ${order}`;
      const mode = { firstType, lastType, order };
      test(name, doublefreetest, mode);
    }
  }
}

// test('double-free', doublefreetest, { firstType: 'object', lastType: 'collection', order: 'first->last' });

test('retirement', async t => {
  const { syscall, fakestore, log } = buildSyscall();
  const gcTools = makeMockGC();

  // A is a weak collection, with one entry, whose key is B (a
  // Presence). We drop the RAM pillar for B and do a BOYD, which
  // should provoke a syscall.dropImports. Then, when we delete A (by
  // dropping the RAM pillar), the next BOYD should see a
  // `syscall.retireImports`.

  let weakmapA;
  let presenceB;

  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { makeScalarBigWeakMapStore } = VatData;

    weakmapA = makeScalarBigWeakMapStore();

    return Far('root', {
      add: p => {
        presenceB = p;
        weakmapA.init(presenceB, 'value');
      },
    });
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch, testHooks } = ls;
  const { valToSlot } = testHooks;

  await dispatch(makeStartVat(kser()));
  log.length = 0;
  const weakmapAvref = valToSlot.get(weakmapA);
  const { subid } = parseVatSlot(weakmapAvref);
  const collectionID = String(subid);

  const rootA = 'o+0';
  const presenceBvref = 'o-1';
  await dispatch(makeMessage(rootA, 'add', [kslot(presenceBvref)]));
  log.length = 0;

  // the fact that weakmapA can recognize presenceA is recorded in a
  // vatstore key
  const recognizerKey = `vom.ir.${presenceBvref}|${collectionID}`;
  t.is(fakestore.get(recognizerKey), '1');

  // tell mockGC that userspace has dropped presenceB
  gcTools.kill(presenceB);
  gcTools.flushAllFRs();

  await dispatch(makeBringOutYourDead());
  const priorKey = `vom.ir.${presenceBvref}|`;

  t.deepEqual(log.splice(0), [
    // when a Presence is dropped, scanForDeadObjects can't drop the
    // underlying vref import until it knows that virtual data isn't
    // holding a reference, so we expect a refcount check
    { type: 'vatstoreGet', key: `vom.rc.${presenceBvref}`, result: undefined },

    // the vref is now in importsToDrop, but since this commonly means
    // it can be retired too, scanForDeadObjects goes ahead and checks
    // for recognizers
    { type: 'vatstoreGetNextKey', priorKey, result: recognizerKey },

    // it found a recognizer, so the vref cannot be retired
    // yet. scanForDeadObjects finishes the BOYD by emitting the
    // dropImports, but should keep watching for an opportunity to
    // retire it too
    { type: 'dropImports', slots: [presenceBvref] },
  ]);

  // now tell mockGC that we're dropping the weakmap too
  gcTools.kill(weakmapA);
  gcTools.flushAllFRs();

  // this will provoke the deletion of the collection and all its
  // data. It should *also* trigger a syscall.retireImports of the
  // no-longer-recognizable key
  await dispatch(makeBringOutYourDead());
  const retires = log.filter(e => e.type === 'retireImports');

  t.deepEqual(retires, [{ type: 'retireImports', slots: [presenceBvref] }]);

  // If the bug is present, the vat won't send `syscall.retireImports`
  // to the kernel. In a full system, that means the kernel can
  // eventually send a `dispatch.retireImports` into the vat, if/when
  // the object's hosting vat decides to drop it. Make sure that won't
  // cause a crash.

  if (!retires.length) {
    console.log(`testing kernel's dispatch.retireImports`);
    await dispatch(makeRetireImports(presenceBvref));
    console.log(`dispatch.retireImports did not crash`);
  }
});
