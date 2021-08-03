/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * installs SES (and does lockdown), plus adds mocks
 * for virtual objects: makeKind, makeWeakStore
 */

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';

import './install-ses-debug.js';
import { makeFakeVirtualObjectManager } from './fakeVirtualObjectManager.js';

const { makeKind, makeWeakStore } = makeFakeVirtualObjectManager({
  cacheSize: 3,
});

globalThis.makeKind = makeKind;
globalThis.makeWeakStore = makeWeakStore;
