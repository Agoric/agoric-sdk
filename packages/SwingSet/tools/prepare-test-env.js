/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * Installs Hardened JS (and does lockdown), plus adds mocks for virtual objects
 * and stores.
 */

import '@endo/init/pre-bundle-source.js';

import './install-ses-debug.js';
import { makeFakeVirtualStuff } from './fakeVirtualSupport.js';

const { vom, cm, wpm } = makeFakeVirtualStuff({ cacheSize: 3 });

const {
  defineKind,
  defineKindMulti,
  defineDurableKind,
  defineDurableKindMulti,
  makeKindHandle,
  canBeDurable,
} = vom;

const {
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
} = cm;

const { watchPromise, providePromiseWatcher } = wpm;

const VatData = harden({
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
});

globalThis.VatData = VatData;
