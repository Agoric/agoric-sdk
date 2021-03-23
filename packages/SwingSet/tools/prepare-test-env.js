/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * installs SES (and does lockdown), plus adds mocks
 * for virtual objects: makeKind, makeWeakStore
 */

import './install-ses-debug';
import { makeFakeVirtualObjectManager } from './fakeVirtualObjectManager';

const { makeKind, makeWeakStore } = makeFakeVirtualObjectManager(3);

globalThis.makeKind = makeKind;
globalThis.makeWeakStore = makeWeakStore;
