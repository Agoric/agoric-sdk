/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * Installs Hardened JS (and does lockdown), plus adds mocks for virtual objects
 * and stores.
 */

import '@endo/init/pre-bundle-source.js';

import './install-ses-debug.js';
import { makeFakeVirtualStuff } from '@agoric/swingset-liveslots/tools/fakeVirtualSupport.js';

function makeEverything(options) {
  const { vom, cm, wpm } = makeFakeVirtualStuff(options);

  const {
    defineKind,
    defineKindMulti,
    defineDurableKind,
    defineDurableKindMulti,
    makeKindHandle,
    canBeDurable,
    flushCache,
  } = vom;

  const {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
    provideBaggage,
  } = cm;

  const { watchPromise, providePromiseWatcher } = wpm;

  const vatData = {
    defineKind,
    defineKindMulti,
    defineDurableKind,
    defineDurableKindMulti,
    makeKindHandle,
    providePromiseWatcher,
    watchPromise,
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
    canBeDurable,
  };

  return harden({ vatData, provideBaggage, flushCache });
}

// we replace these during simulated upgrade, so each incarnation gets
// a new set
let currentVatData = makeEverything({ cacheSize: 3 }).vatData;

// these are exported/imported in pieces, so they are immutable
const VatData = {};
for (const name of Object.keys(currentVatData)) {
  VatData[name] = (...args) => currentVatData[name](...args);
}
harden(VatData);

globalThis.VatData = VatData;

let entryCount = 0;
let incarnationStore;

// runs async thunk() within a simulated per-upgrade "incarnation"
export const simulateIncarnation = async thunk => {
  assert.equal(entryCount, 0, `re-entrant simulateIncarnation() forbidden`);
  entryCount += 1;
  // make a new backing store by cloning the previous one, if any
  incarnationStore = new Map(incarnationStore);
  const { vatData, provideBaggage, flushCache } = makeEverything({
    cacheSize: 3,
    fakeStore: incarnationStore,
  });
  currentVatData = vatData;
  const baggage = provideBaggage();

  await thunk(baggage);
  flushCache();
  entryCount -= 1;
};
harden(simulateIncarnation);
