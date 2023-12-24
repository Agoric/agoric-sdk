// @ts-nocheck
import test from 'ava';

import { kunser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { buildVatController } from '../../src/index.js';

// Check that facets which don't reference their state still keep their cohort alive

// Test what happens when userspace builds recognizers for various VO
// components. The overriding rule is that userspace must not be able
// to sense GC.
//
// A "recognizer" is a tool which, given an original object, stashes
// something so that later it can receive a second sample, and decide
// whether it is the same as the original. We deny WeakRef and
// FinalizationRegistry to userspace, so the two remaining recognizer
// tools are:
//
// * 1: retain the original, compare the sample with ===
// * 2: store the original in a WeakMap/WeakSet, compare with .has
//
// We cannot forbid the first. Userspace doesn't get a real WeakMap or
// WeakSet, but rather a VirtualObjectAwareWeakMap/Set that we
// construct within the VOM, which applies special treatment to
// vref-bearing objects, as well as objects marked "unweakable" (by
// being placed in a private WeakSet).
//
// Any object that we expose to userspace could be used as a
// recognizer. We want to ensure that none of them will enable the
// sensing of GC. But we're ok with userspace being able to sense the
// border between one crank and the next. Other constraints are that
// we want to minimize the number of vatstore operations needed to
// support common use cases (hence caching), minimize the amount of
// RAM we spend on data (hence cache flushing), and move precious data
// from RAM into the DB in a timely fashion (hence cache writeback at
// end-of-crank).

// Each Representative is an empty object (with a distinct identity),
// whose prototype points to a common "facet prototype" object. Each
// multi-facet Kind creates one prototype object per facet name, and
// populates it with wrapper methods as appropriate. Single-facet
// Kinds create a single (unnamed) prototype object. These prototype
// objects are created during `defineKind`, and survive until the end
// of the vat incarnation (i.e. upgrade or termination). All instances
// of the Kind share the same prototype objects. So retaining or
// comparing prototype objects doesn't reveal anything about GC

// The methods of a virtual object are invoked with a `context`
// object, which contains `{ state, self }` or `{ state, facets }`
// (for multi-facet Kinds, where 'facets' is a record of
// Representative objects). All facets of a given cohort/instance
// share the same 'context' object.

// In any given crank, a new 'context'/'state' object pair is created
// the first time a VO method is invoked, and is given to all VO
// method invocations within that crank. They remain functional
// forever. The VOM discards the context/state pair at end-of-crank,
// and will make new ones in subsequent cranks (if they invoke VO
// methods again). Userspace might retain either one, and use them in
// a recognizer, but their lifetime is not related to VO GC behavior,
// so they do not provide a GC sensor, merely a crank sensor.

// The 'facets' cohort is a record, one property per facet. So a
// defineKindMulti with a pair of `incrementer` and `decrementer`
// facets will create `facets = { incrementer, decrementer }`. All
// three of `facets`, `incrementer`, and `decrementer` share a
// lifetime, which we'll call the "facet lifetime", because of
// reference edges we put in the `linkToCohort` WeakMap. This facet
// lifetime starts when userspace deserializes any facet within the
// cohort, and continues until 1: userspace drops their references to
// all Representatives in the cohort, and 2: GC collects the cluster.

// This is the GC that we must prevent userspace from sensing. Using
// the first sensor technique (retain `facets` or an individual facet,
// then compare the second sample with "===") would cause the entire
// graph to be retained, so merely asking the question would force the
// answer to always be "yes". To prohibit the second technique (retain
// `facets` or a facet in a WeakMap/WeakSet), we rely upon the special
// treatment that our VO-aware WeakMap/Set applies:
// * each facet has a vref, triggering the special behavior
// * we add 'facets' to the "unweakable" set, which does the same

test('retention', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker', // for stability against GC
    defaultReapInterval: 1, // for explicitness (kernel defaults to 1 anyways)
    bootstrap: 'bootstrap',
    vats: {
      bob: {
        sourceSpec: new URL('vat-orphan-bob.js', import.meta.url).pathname,
      },
      bootstrap: {
        sourceSpec: new URL('vat-orphan-bootstrap.js', import.meta.url)
          .pathname,
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;

  const c = await buildVatController(config, [], { kernelStorage });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const remaining = new Set();
  for (const how of ['retain', 'weakset']) {
    // on both
    for (const what of ['facet', 'method', 'proto', 'context', 'state']) {
      for (const kind of ['single', 'multi']) {
        remaining.add(`${kind}-${what}-${how}`);
      }
    }
    remaining.add(`single-self-${how}`);
    remaining.add(`multi-empty-${how}`);
    remaining.add(`multi-cohort-${how}`);
  }

  async function go(kind, what, how, same) {
    const r = c.queueToVatRoot('bootstrap', 'run', [kind, what, how], 'ignore');
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    remaining.delete(`${kind}-${what}-${how}`);
    const desc = `${kind}-${what}-${how}-${same}`;
    // console.log(kind, what, how, kunser(c.kpResolution(r)), same, desc);
    t.is(kunser(c.kpResolution(r)), same, desc);
  }

  // holding any member of the facets/facet cluster will keep the
  // other members alive, so compare-by-=== is tautologically true
  await go('single', 'facet', 'retain', true);
  await go('single', 'self', 'retain', true);
  await go('multi', 'empty', 'retain', true);
  await go('multi', 'facet', 'retain', true);
  await go('multi', 'cohort', 'retain', true);

  // userspace WeakSet stores vrefs for facets
  await go('single', 'facet', 'weakset', true);
  await go('single', 'self', 'weakset', true);
  await go('multi', 'empty', 'weakset', true);
  await go('multi', 'facet', 'weakset', true);
  // and the cohort is marked as "unweakable", so held strongly by WeakSet
  await go('multi', 'cohort', 'weakset', true);

  // methods and prototypes are incarnation-scoped, not crank- or
  // facet-lifetime- scoped, so retaining either causes no problem
  await go('single', 'method', 'retain', true);
  await go('single', 'proto', 'retain', true);
  await go('multi', 'method', 'retain', true);
  await go('multi', 'proto', 'retain', true);
  await go('single', 'method', 'weakset', true);
  await go('single', 'proto', 'weakset', true);
  await go('multi', 'method', 'weakset', true);
  await go('multi', 'proto', 'weakset', true);

  // 'context' is remade on each crank
  await go('single', 'context', 'retain', false);
  await go('multi', 'context', 'retain', false);
  await go('single', 'context', 'weakset', false);
  await go('multi', 'context', 'weakset', false);
  // as is 'state'
  await go('single', 'state', 'retain', false);
  await go('multi', 'state', 'retain', false);
  await go('single', 'state', 'weakset', false);
  await go('multi', 'state', 'weakset', false);

  if (remaining.size) {
    const missed = [...remaining].join(', ');
    t.fail(`test-representative.js/retention missed: ${missed}`);
  }
});
