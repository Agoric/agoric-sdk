/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * installs SES (and does lockdown), plus adds mocks
 * for virtual objects: makeKind, makeVirtualScalarWeakMap
 */

import '@endo/init/pre-bundle-source.js';

import './install-ses-debug.js';
import { makeFakeVirtualObjectManager } from './fakeVirtualObjectManager.js';

const { makeKind, makeVirtualScalarWeakMap } = makeFakeVirtualObjectManager({
  cacheSize: 3,
});

globalThis.makeKind = makeKind;
globalThis.makeVirtualScalarWeakMap = makeVirtualScalarWeakMap;
