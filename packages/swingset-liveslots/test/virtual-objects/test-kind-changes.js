import test from 'ava';
import '@endo/init/debug.js';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

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

  // deleting late-alphabet facets is accepted (but shouldn't be!),
  // but a behavior with only one facet is rejected by
  // defendPrototypeKit
  const err1 = { message: 'A multi-facet object must have multiple facets' };
  trial(bBar, err1);

  // deleting early- or middle-alphabet facets is rejected by VOM
  const err2 = {
    message:
      /durable kind ""FooBarClu"" facets .* don't match original definition/,
  };
  trial(bFoo, err2);
  trial(bFooBar, err2);

  // deleting late-alphabet facets should be rejected, but isn't
  // trial(bCluBar, err2);
  works(bCluBar); // TODO REMOVE, SHOULD NOT WORK

  // same facets in same order: ok
  works(bFooBarClu);
  // same facets in different order: ok
  works(bBarFooClu);

  // adding new facets ought to work, but does not. when 7437 is
  // fixed, swap in the commented out trials

  // works(bFooBarCluZot);
  trial(bFooBarCluZot, err2);
  // works(bFooBarCluArf);
  trial(bFooBarCluArf, err2);
  // works(bFooBarCluBaz);
  trial(bFooBarCluBaz, err2);
  // works(bArfFooBarClu);
  trial(bArfFooBarClu, err2);
  // works(bZotFooBarClu);
  trial(bZotFooBarClu, err2);
  // works(bBazFooBarClu);
  trial(bBazFooBarClu, err2);

  // multi->single: error
  const err3 = {
    message: 'defineDurableKind called for faceted KindHandle "FooBarClu"',
  };
  trial('single', err3);
});
