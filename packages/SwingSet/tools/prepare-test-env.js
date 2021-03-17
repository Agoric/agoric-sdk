/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * installs SES (and does lockdown), plus adds mocks
 * for virtual objects: makeKind, makeWeakStore
 */

import { wrapTest } from '@agoric/ses-ava';
import '@agoric/install-ses';
import rawTest from 'ava';

import { makeFakeVirtualObjectManager } from './fakeVirtualObjectManager';

const test = wrapTest(rawTest);

const { makeKind, makeWeakStore } = makeFakeVirtualObjectManager(3);

globalThis.makeKind = makeKind;
globalThis.makeWeakStore = makeWeakStore;
