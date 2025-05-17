import test from 'ava';

import { Far } from '@endo/marshal';
import { kser, kslot } from '@agoric/kmarshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { parseVatSlot } from '../src/parseVatSlots.js';
import { buildSyscall } from './liveslots-helpers.js';
import { makeMessage, makeStartVat, makeBringOutYourDead } from './util.js';
import { makeMockGC } from './mock-gc.js';

const getPrefixedKeys = (map, prefix) => {
  const keys = [];
  for (const key of map.keys()) {
    if (key.startsWith(prefix)) {
      keys.push(key.substring(prefix.length));
    }
  }
  return keys;
};

const collectionMetaKeys = new Set([
  '|nextOrdinal',
  '|entryCount',
  '|schemata',
]);

const scanCollection = (kvStore, collectionID) => {
  const collectionPrefix = `vc.${collectionID}.`;
  const ordinalAssignments = [];
  const entries = [];
  const metaKeys = [];
  let totalKeys = 0;
  for (const key of getPrefixedKeys(kvStore, collectionPrefix)) {
    totalKeys += 1;
    if (key.startsWith('|')) {
      if (collectionMetaKeys.has(key)) {
        metaKeys.push(key);
      } else {
        ordinalAssignments.push(key);
      }
    } else {
      entries.push(key);
    }
  }
  const keyVrefs = [];
  const refcounts = {};
  for (const ordinalKey of ordinalAssignments) {
    const vref = ordinalKey.substring(1);
    keyVrefs.push(vref);
    const rcKey = `vom.rc.${vref}`;
    refcounts[vref] = kvStore.get(rcKey);
  }
  return {
    totalKeys,
    metaKeys,
    ordinalAssignments,
    entries,
    keyVrefs,
    refcounts,
  };
};

const GC = ['dropImports', 'retireImports', 'retireExports'];

const doTest = async (t, mode) => {
  assert(['strong-clear', 'strong-delete', 'weak-delete'].includes(mode));
  const kvStore = new Map();
  const { syscall, log } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();
  const COUNT = 5;

  // we'll either call holder.clear() to exercise manual clearing, or
  // gcTools.kill(holder) to exercise the collection itself being
  // deleted

  let holder;

  function build(vatPowers) {
    const { defineKind, makeScalarBigSetStore } = vatPowers.VatData;
    const make = defineKind('target', () => ({}), {});
    holder = makeScalarBigSetStore('holder');
    const root = Far('root', {
      create() {
        for (let i = 0; i < COUNT; i += 1) {
          // vrefs are all `o+v10/${N}`, N=1..10
          const target = make();
          holder.add(target);
          // we immediately delete the presence, but the finalizers
          // won't run until gcTools.flushAllFRs()
          gcTools.kill(target);
        }
      },
      clear() {
        holder.clear();
      },
    });
    return root;
  }

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject: build,
  }));
  const { dispatch, testHooks } = ls;
  const { valToSlot } = testHooks;
  await dispatch(makeStartVat(kser()));
  log.length = 0;

  const rootA = 'o+0';

  await dispatch(makeMessage(rootA, 'create', []));
  log.length = 0;

  const holderVref = valToSlot.get(holder);
  const collectionID = Number(parseVatSlot(holderVref).subid);
  const populated = scanCollection(kvStore, collectionID);
  t.is(populated.ordinalAssignments.length, COUNT);
  t.is(populated.entries.length, COUNT);
  t.is(populated.keyVrefs.length, COUNT);
  t.true(populated.keyVrefs.every(vref => populated.refcounts[vref] === '1'));

  // Collect the representatives, leaving only the virtual-data
  // pillar. This BOYD finds non-zero virtual-data refcounts for all
  // five VOs, so they are not deleted.
  gcTools.flushAllFRs();
  const boyd1 = await dispatch(makeBringOutYourDead());
  t.is(boyd1.possiblyDeadSet, 0);
  t.is(boyd1.possiblyRetiredSet, 0);
  log.length = 0;
  t.is(scanCollection(kvStore, collectionID).totalKeys, populated.totalKeys);

  if (mode === 'strong-clear') {
    // clearing the collections should delete both the data key and the
    // ordinal key for each entry, but it won't delete the values, that
    // is deferred until BOYD. The metadata is retained, because the
    // collection has been cleared, not deleted.
    await dispatch(makeMessage(rootA, 'clear', []));
  } else if (mode === 'strong-delete') {
    gcTools.kill(holder);
    gcTools.flushAllFRs();
    await dispatch(makeBringOutYourDead());
    // that should clear everything, both the holder and the referenced
    // targets
  }

  const scan2 = scanCollection(kvStore, collectionID);

  // all entries should be gone
  t.is(scan2.ordinalAssignments.length, 0);
  t.is(scan2.entries.length, 0);
  t.is(scan2.keyVrefs.length, 0);

  if (mode === 'strong-clear') {
    // but the collection itself is still present
    t.is(scan2.metaKeys.length, populated.metaKeys.length);
    for (const vref of populated.keyVrefs) {
      const rcKey = `vom.rc.${vref}`;
      const rc = kvStore.get(rcKey);
      // the target refcounts should be zero (= undefined)
      t.is(rc, undefined);
      // but the data should still be present
      const dataKey = `vom.${vref}`;
      const data = kvStore.get(dataKey);
      t.is(data, '{}');
    }
    // and we need one more BOYD to notice the zero refcounts and
    // delete the data
    await dispatch(makeBringOutYourDead());
  } else if (mode === 'strong-delete') {
    // the collection should be gone
    t.is(scan2.metaKeys.length, 0);
    t.is(scan2.totalKeys, 0);
  }

  // all the targets should be collected now
  for (const vref of populated.keyVrefs) {
    const rcKey = `vom.rc.${vref}`;
    const rc = kvStore.get(rcKey);
    // the target refcounts should be zero (= undefined)
    t.is(rc, undefined);
    const dataKey = `vom.${vref}`;
    const data = kvStore.get(dataKey);
    t.is(data, undefined);
  }

  // none of the Presences were exported, so no GC syscalls
  const gcCalls1 = log.filter(l => GC.includes(l.type));
  t.deepEqual(gcCalls1, []);
};

// When a virtual collection's keys are the only reference to a
// virtual object, collection.clear() should let them be deleted. Bug
// #8756 caused the keys to be retained by mistake.

test('collection.clear() deletes keys', async t => {
  await doTest(t, 'strong-clear');
});

// Allowing GC to delete a strong collection should delete/release the
// keys too

test('deleting a strong collection will delete the keys', async t => {
  await doTest(t, 'strong-delete');
});

// Allowing GC to delete a weak collection should retire the keys, and
// delete/release the contents.

test('deleting a weak collection will retire the keys', async t => {
  const kvStore = new Map();
  const { syscall, log } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();
  const COUNT = 5;
  const allVrefs = [];
  const allKslots = [];
  for (let i = 0; i < COUNT; i += 1) {
    const vref = `o-${i + 1}`;
    allVrefs.push(vref);
    allKslots.push(kslot(vref, 'imported'));
  }

  let recognizer;

  // Import a bunch of Presences and hold them in a weakset. Drop the
  // imports, but retain recognition, until we drop the weakset, which
  // should delete the collection and notify the kernel that we aren't
  // recognizing the keys (syscall.retireImports)
  function build(vatPowers) {
    const { makeScalarBigWeakSetStore } = vatPowers.VatData;
    recognizer = makeScalarBigWeakSetStore('recognizer');
    const root = Far('root', {
      create(presences) {
        for (const p of presences) {
          recognizer.add(p);
          // we immediately delete the presence, but the finalizers
          // won't run until gcTools.flushAllFRs()
          gcTools.kill(p);
        }
      },
    });
    return root;
  }

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject: build,
  }));
  const { dispatch, testHooks } = ls;
  const { valToSlot } = testHooks;
  await dispatch(makeStartVat(kser()));
  log.length = 0;

  const rootA = 'o+0';

  await dispatch(makeMessage(rootA, 'create', [allKslots]));
  log.length = 0;

  const recognizerVref = valToSlot.get(recognizer);
  const collectionID = Number(parseVatSlot(recognizerVref).subid);

  // all the Presences should be recognized by the collection, but not
  // referenced
  const populated = scanCollection(kvStore, collectionID);
  t.is(populated.ordinalAssignments.length, COUNT);
  t.is(populated.entries.length, COUNT);
  t.is(populated.keyVrefs.length, COUNT);
  t.true(
    populated.keyVrefs.every(vref => populated.refcounts[vref] === undefined),
  );
  // and there should be recognizer (.ir) entries for each vref|collection pair
  t.true(
    populated.keyVrefs.every(vref =>
      kvStore.has(`vom.ir.${vref}|${collectionID}`),
    ),
  );

  // collect the Presences, which was the only remaining reachability
  // pillar, leaving just the recognizers
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());
  // no changes to the collection
  t.deepEqual(scanCollection(kvStore, collectionID), populated);
  // but the Presence vrefs should be dropped
  const gcCalls1 = log.filter(l => GC.includes(l.type));
  t.deepEqual(gcCalls1, [{ type: 'dropImports', slots: allVrefs }]);
  log.length = 0;

  // now free the whole collection
  gcTools.kill(recognizer);
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());

  // the collection should be gone
  const scan2 = scanCollection(kvStore, collectionID);
  t.is(scan2.totalKeys, 0);

  // and the .ir entries
  t.true(
    populated.keyVrefs.every(
      vref => !kvStore.has(`vom.ir.${vref}|${collectionID}`),
    ),
  );

  // and the kernel should be notified that we don't care anymore
  const gcCalls2 = log.filter(l => GC.includes(l.type));
  t.deepEqual(gcCalls2, [{ type: 'retireImports', slots: allVrefs }]);
});

// Allowing GC to delete a voAwareWeakSet (or Map) should retire the
// keys, and delete/release the contents.

test('deleting a voAwareWeakSet will retire the keys', async t => {
  const kvStore = new Map();
  const { syscall, log } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();
  const COUNT = 5;
  const allVrefs = [];
  const allKslots = [];
  for (let i = 0; i < COUNT; i += 1) {
    const vref = `o-${i + 1}`;
    allVrefs.push(vref);
    allKslots.push(kslot(vref, 'imported'));
  }

  let recognizer;

  // Import a bunch of Presences and hold them in a weakset. Drop the
  // imports, but retain recognition, until we drop the weakset, which
  // should delete the collection and notify the kernel that we aren't
  // recognizing the keys (syscall.retireImports)
  function build(vatPowers) {
    recognizer = new vatPowers.WeakSet();
    const root = Far('root', {
      create(presences) {
        for (const p of presences) {
          recognizer.add(p);
          // we immediately delete the presence, but the finalizers
          // won't run until gcTools.flushAllFRs()
          gcTools.kill(p);
        }
      },
    });
    return root;
  }

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject: build,
  }));
  const { dispatch, testHooks } = ls;
  const { vrefRecognizers } = testHooks;
  await dispatch(makeStartVat(kser()));
  log.length = 0;

  const rootA = 'o+0';

  await dispatch(makeMessage(rootA, 'create', [allKslots]));
  log.length = 0;

  // the WeakSet has no vref, and doesn't store anything like ".ir"
  // entries in vatstore, but we can snoop on its internal
  // tables. vrefRecognizers is a Map, keyed by vref, with an entry
  // for every vref that is tracked by any voAwareWeakMap/Set. The
  // value is a Set of virtualObjectMaps, the internal/hidden Set used
  // by voAwareWeakMap/Sets.

  const vrefKeys = [...vrefRecognizers.keys()].sort();

  // we should be tracking all the presences
  t.is(vrefKeys.length, COUNT);
  // each vref should have a single recognizer
  t.true(vrefKeys.every(vref => vrefRecognizers.get(vref).size === 1));
  // that single recognizer should be the virtualObjectMap for our voAwareWeakSet
  const virtualObjectMap = [...vrefRecognizers.get(vrefKeys[0])][0];
  // they should all point to the same one
  t.true(
    vrefKeys.every(
      vref => [...vrefRecognizers.get(vref)][0] === virtualObjectMap,
    ),
  );

  // collect the Presences, which was the only remaining reachability
  // pillar, leaving just the recognizers
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());
  // no changes to the collection
  t.is(vrefKeys.length, COUNT);
  t.true(vrefKeys.every(vref => vrefRecognizers.get(vref).size === 1));
  t.true(
    vrefKeys.every(
      vref => [...vrefRecognizers.get(vref)][0] === virtualObjectMap,
    ),
  );

  // but the Presence vrefs should be dropped
  const gcCalls1 = log.filter(l => GC.includes(l.type));
  t.deepEqual(gcCalls1, [{ type: 'dropImports', slots: allVrefs }]);
  log.length = 0;

  // now free the whole collection
  gcTools.kill(recognizer);
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());

  // the collection should be gone
  t.is(vrefRecognizers.size, 0);

  // and the kernel should be notified that we don't care anymore
  const gcCalls2 = log.filter(l => GC.includes(l.type));
  t.deepEqual(gcCalls2, [{ type: 'retireImports', slots: allVrefs }]);
});

// explore remediation/leftover problems from bugs #7355, #8756, #9956
// where the DB has corrupted data leftover from before they were fixed

test('missing recognition record during delete', async t => {
  const kvStore = new Map();
  const { syscall, log } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();

  let recognizer;
  let target;

  // liveslots didn't always add "vom.ir." recognition-records for
  // Remotable-style keys, nor remove them when the key was
  // deleted. So a kernel which adds a key, upgrades to the current
  // (fixed) version, then attempts to delete the key, will not see
  // the record it is expecting. Make sure this doesn't cause
  // problems.

  function build(vatPowers) {
    const { makeScalarBigWeakSetStore } = vatPowers.VatData;
    recognizer = makeScalarBigWeakSetStore('recognizer');
    target = Far('target', {});
    const root = Far('root', {
      store() {
        recognizer.add(target);
      },
      delete() {
        recognizer.delete(target);
      },
    });
    return root;
  }

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject: build,
  }));
  const { dispatch, testHooks } = ls;
  const { valToSlot } = testHooks;
  await dispatch(makeStartVat(kser()));
  log.length = 0;

  const rootA = 'o+0';

  await dispatch(makeMessage(rootA, 'store'));
  log.length = 0;

  const targetVref = valToSlot.get(target);
  const recognizerVref = valToSlot.get(recognizer);
  const collectionID = Number(parseVatSlot(recognizerVref).subid);
  const ordinalAssignmentKey = `vc.${collectionID}.|${targetVref}`;
  const ordinalNumber = kvStore.get(ordinalAssignmentKey);
  t.is(ordinalNumber, '1');
  const dataKey = `vc.${collectionID}.r0000000001:${targetVref}`;
  const value = kvStore.get(dataKey);
  t.deepEqual(JSON.parse(value), { body: '#null', slots: [] });

  // the correct recognition record key
  const rrKey = `vom.ir.${targetVref}|${collectionID}`;

  // our fixed version creates one
  t.is(kvStore.get(rrKey), '1');

  // now simulate data from the broken version, by deleting the
  // recognition record
  kvStore.delete(rrKey);

  // check that deleting the same Remotable doesn't break
  await dispatch(makeMessage(rootA, 'delete'));
  t.false(kvStore.has(ordinalAssignmentKey));
  t.false(kvStore.has(dataKey));
});

// This test is marked as failing because we do not have any
// remediation code for #8756. Collections which were cleared before
// the fix will be corrupted, such that the old keys appear to still
// be present, even after the fix has been applied. This test
// demonstrates that we can still *not* handle the following sequence:
//
// * (in old version, without fix for #8756):
// * const c = makeScalarBigMapStore();
// * const key = Far(); // or any remotable
// * c.add(key, 'value');
// * c.clear();
// * (then in new version, with fix)
// * assert.equal(c.has(key), false);
// * c.init(key, 'new value');

test.failing('leftover ordinal-assignment record during init', async t => {
  const kvStore = new Map();
  const { syscall, log } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();

  let store;
  let target;
  /** @type {any} */
  let result;

  // liveslots didn't always remove the "vc.${collectionID}.|${vref}"
  // ordinal-assignment records when clearing or deleting a
  // collection. So a kernel which adds a key, upgrades to the current
  // (fixed) version, then clears the collection, will have a leftover
  // record. See if this will cause problems when iterating keys or
  // re-adding the same key later.

  function build(vatPowers) {
    const { makeScalarBigMapStore } = vatPowers.VatData;
    store = makeScalarBigMapStore('store');
    target = Far('target', {});
    const root = Far('root', {
      store() {
        try {
          store.init(target, 123);
          result = 'ok';
        } catch (e) {
          result = e;
        }
      },
      clear() {
        store.clear();
      },
      has() {
        result = store.has(target);
      },
    });
    return root;
  }

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject: build,
  }));
  const { dispatch, testHooks } = ls;
  const { valToSlot } = testHooks;
  await dispatch(makeStartVat(kser()));
  log.length = 0;

  const rootA = 'o+0';

  result = undefined;
  await dispatch(makeMessage(rootA, 'store'));
  t.is(result, 'ok');

  const targetVref = valToSlot.get(target);
  const storeVref = valToSlot.get(store);
  const collectionID = Number(parseVatSlot(storeVref).subid);
  const ordinalAssignmentKey = `vc.${collectionID}.|${targetVref}`;
  const ordinalNumber = kvStore.get(ordinalAssignmentKey);
  t.is(ordinalNumber, '1');
  const dataKey = `vc.${collectionID}.r0000000001:${targetVref}`;
  const value = kvStore.get(dataKey);
  t.deepEqual(JSON.parse(value), { body: '#123', slots: [] });

  result = undefined;
  await dispatch(makeMessage(rootA, 'clear'));

  // now simulate data from the broken version, by restoring the
  // ordinal-assignment record, as if the code failed to delete it

  kvStore.set(ordinalAssignmentKey, '1');

  // problem 1: store.has() should report "false", but incorrectly
  // returns "true"

  result = undefined;
  await dispatch(makeMessage(rootA, 'has'));
  t.is(result, false);

  // problem 2: store.init() to re-add the old key should succeed, but
  // incorrectly fails (because the store thinks the key is already
  // present)

  result = undefined;
  await dispatch(makeMessage(rootA, 'store'));
  t.is(result, 'ok');

  // other likely problems: store.keys() will report the old key,
  // store.get(oldkey) will probably crash
});
