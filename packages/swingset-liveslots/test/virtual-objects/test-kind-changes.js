// @ts-nocheck
import test from 'ava';
import { Far } from '@endo/marshal';
import { kser } from '@agoric/kmarshal';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';
import { makeLiveSlots } from '../../src/liveslots.js';
import { parseVatSlot } from '../../src/parseVatSlots.js';
import { buildSyscall } from '../liveslots-helpers.js';
import { makeStartVat, makeMessage } from '../util.js';
import { makeMockGC } from '../mock-gc.js';

const init = () => ({});
const behavior = {};
// (empty) facets which each Kind may or may not have
const foo = {};
const bar = {};
const baz = {};
const clu = {};
const zot = {};
const arf = {};

// behaviors with different combinations of facets
const bBar = { bar }; // only one facet, rejected by defendPrototypeKit
const bFoo = { foo }; // only one facet, rejected by defendPrototypeKit
const bFooClu = { foo, clu }; // missing alphabetic first
const bFooBar = { foo, bar }; // missing alphabetic middle
const bCluBar = { clu, bar }; // missing alphabetic last
const bFooBarClu = { foo, bar, clu }; // starting point
const bBarFooClu = { bar, foo, clu }; // same facets, different order
const bFooBarCluZot = { foo, bar, clu, zot }; // add alphabetic last
const bFooBarCluArf = { foo, bar, clu, arf }; // add alphabetic first
const bFooBarCluBaz = { foo, bar, clu, baz }; // add alphabetic middle
const bArfFooBarClu = { arf, foo, bar, clu }; // add alphabetic last
const bZotFooBarClu = { zot, foo, bar, clu }; // add alphabetic first
const bBazFooBarClu = { baz, foo, bar, clu }; // add alphabetic middle

// durable Kinds can be upgraded to a compatible definition, but all
// previous facets must be provided

test('kind upgrade from single', t => {
  const fakeStore = new Map();
  // note: relaxDurabilityRules defaults to true in fake tools
  const vs1 = makeFakeVirtualStuff({ relaxDurabilityRules: false, fakeStore });
  const { vom: vom1, cm: cm1 } = vs1;
  const baggage1 = cm1.provideBaggage();
  const kh1 = vom1.makeKindHandle('single');
  baggage1.init('kh', kh1);
  vom1.defineDurableKind(kh1, init, behavior);
  vom1.flushStateCache();
  cm1.flushSchemaCache();

  // Simulate upgrade by starting from the non-empty kvStore.
  const clonedStore = new Map(fakeStore);
  const vs2 = makeFakeVirtualStuff({
    relaxDurabilityRules: false,
    fakeStore: clonedStore,
  });
  const { vom: vom2, cm: cm2 } = vs2;
  const baggage2 = cm2.provideBaggage();
  const kh2 = baggage2.get('kh');
  const err1 = {
    message: 'defineDurableKindMulti called for unfaceted KindHandle "single"',
  };
  t.throws(() => vom2.defineDurableKindMulti(kh2, init, bFoo), err1);
  t.throws(() => vom2.defineDurableKindMulti(kh2, init, bFooClu), err1);
});

test('kind upgrade from multi', t => {
  const fakeStore = new Map();
  const vs1 = makeFakeVirtualStuff({ relaxDurabilityRules: false, fakeStore });
  const { vom: vom1, cm: cm1 } = vs1;
  const baggage1 = cm1.provideBaggage();
  const kh1 = vom1.makeKindHandle('FooBarClu');
  baggage1.init('kh', kh1);
  vom1.defineDurableKindMulti(kh1, init, bFooBarClu);
  vom1.flushStateCache();
  cm1.flushSchemaCache();

  const trial = (behaviors, err) => {
    // Simulate upgrade by starting from the non-empty kvStore.
    const clonedStore = new Map(fakeStore);
    const vs2 = makeFakeVirtualStuff({
      relaxDurabilityRules: false,
      fakeStore: clonedStore,
    });
    const { vom: vom2, cm: cm2 } = vs2;
    const baggage2 = cm2.provideBaggage();
    const kh2 = baggage2.get('kh');
    if (err) {
      if (behaviors === 'single') {
        t.throws(() => vom2.defineDurableKind(kh2, init, foo), err);
      } else {
        t.throws(() => vom2.defineDurableKindMulti(kh2, init, behaviors), err);
      }
    } else {
      t.truthy(vom2.defineDurableKindMulti(kh2, init, behaviors));
    }
  };
  const works = behaviors => trial(behaviors, null);

  const m = (proposed, missing) => ({
    message: `durable kind ""FooBarClu"" facets ("${proposed}") is missing "${missing}" from original definition ("bar,clu,foo")`,
  });

  // deleting late-alphabet facets is rejected by VOM
  trial(bBar, m('bar', 'clu'));

  // deleting early- or middle-alphabet facets is rejected by VOM
  trial(bFoo, m('foo', 'bar'));

  trial(bFooBar, m('bar,foo', 'clu'));
  trial(bCluBar, m('bar,clu', 'foo'));

  // same facets in same order: ok
  works(bFooBarClu);
  // same facets in different order: ok
  works(bBarFooClu);

  // adding new facets ought to work

  works(bFooBarCluZot);
  works(bFooBarCluArf);
  works(bFooBarCluBaz);
  works(bArfFooBarClu);
  works(bZotFooBarClu);
  works(bBazFooBarClu);

  // multi->single: error
  trial('single', {
    message: 'defineDurableKind called for faceted KindHandle "FooBarClu"',
  });
});

test('export status across new-facet upgrade', async t => {
  const kvStore = new Map();
  const { syscall: sc1, log: log1 } = buildSyscall({ kvStore });
  const gcTools = makeMockGC();

  let one1;

  function build1(vatPowers, _vp, baggage) {
    const { VatData } = vatPowers;
    const { makeKindHandle, defineDurableKindMulti } = VatData;
    const kh = makeKindHandle('multi');
    baggage.init('kh', kh);
    const one = {};
    const two = {};
    const bOneTwo = { one, two };
    const make = defineDurableKindMulti(kh, init, bOneTwo);

    return Far('root', {
      exportOne: () => {
        const obj1 = make();
        one1 = obj1.one;
        return one1;
      },
    });
  }

  const makeNS1 = () => ({ buildRootObject: build1 });
  const ls1 = makeLiveSlots(sc1, 'vatA', {}, {}, gcTools, undefined, makeNS1);
  await ls1.dispatch(makeStartVat(kser()));
  log1.length = 0;
  const rootA = 'o+0';
  const oneKPID = 'p-1';
  await ls1.dispatch(makeMessage(rootA, 'exportOne', [], oneKPID));

  const oneVref = ls1.testHooks.valToSlot.get(one1);
  const oneBaseRef = parseVatSlot(oneVref).baseRef;
  const oneKind = `${parseVatSlot(oneVref).id}`;
  const descriptorKey = `vom.dkind.${oneKind}.descriptor`;
  const descriptor1 = JSON.parse(kvStore.get(descriptorKey));

  // facets are sorted property names of the initial behavior record
  t.deepEqual(descriptor1.facets, ['one', 'two']);
  const es1 = kvStore.get(`vom.es.${oneBaseRef}`);

  // export status is a string, one letter per facet, same order as
  // descriptor.facets . The 'one' facet will be 'r' for reachable
  // (since it was emitted as the resolution of oneKPID), the 'two'
  // facet is 'n' for 'neither' (since it was not emitted).
  t.is(es1, 'rn');

  // now upgrade to a Kind with two new facets, and export the third

  const { syscall: sc2, log: log2 } = buildSyscall({ kvStore });

  function build2(vatPowers, _vp, baggage) {
    const { VatData } = vatPowers;
    const { defineDurableKindMulti } = VatData;
    const kh = baggage.get('kh');
    const one = { getThree: ({ facets }) => facets.three };
    const two = {};
    const three = {};
    const four = {};
    const bOneTwoThreeFour = { one, two, three, four };
    defineDurableKindMulti(kh, init, bOneTwoThreeFour);

    return Far('root', {});
  }

  const makeNS2 = () => ({ buildRootObject: build2 });
  const ls2 = makeLiveSlots(sc2, 'vatA', {}, {}, gcTools, undefined, makeNS2);
  await ls2.dispatch(makeStartVat(kser()));
  log2.length = 0;
  const threeKPID = 'p-2';
  await ls2.dispatch(makeMessage(oneVref, 'getThree', [], threeKPID));
  // returning/exporting 'three' will call setExportStatus() to update
  // the export status from "only 'one' is exported'" to "both 'one'
  // and 'three' are exported". That will see the old export status
  // with only two items, and upgrade it to the full four items.

  const descriptor2 = JSON.parse(kvStore.get(descriptorKey));

  // old facets retain their position, new facets are added in sorted order
  t.deepEqual(descriptor2.facets, ['one', 'two', 'four', 'three']);
  const es2 = kvStore.get(`vom.es.${oneBaseRef}`);
  t.is(es2, 'rnnr'); // 'one' and 'three' are exported
});
