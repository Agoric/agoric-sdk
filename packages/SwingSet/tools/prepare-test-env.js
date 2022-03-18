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

const { vom, cm } = makeFakeVirtualStuff({ cacheSize: 3 });

const { defineKind, defineDurableKind, makeKindHandle } = vom;

const {
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
} = cm;

const VatData = harden({
  defineKind,
  defineDurableKind,
  makeKindHandle,
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
});

globalThis.VatData = VatData;
