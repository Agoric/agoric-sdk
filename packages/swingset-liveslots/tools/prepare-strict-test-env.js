/**
 * Prepare Agoric SwingSet vat global strict environment for testing.
 *
 * Installs Hardened JS (and does lockdown), plus adds mocks for virtual objects
 * and stores.
 *
 * Exports tools for simulating upgrades.
 */

import '@agoric/internal/src/install-ses-debug.js';

import { reincarnate } from './setup-vat-data.js';

/** @type {ReturnType<typeof reincarnate>} */
let incarnation;

export const annihilate = () => {
  incarnation = reincarnate({ relaxDurabilityRules: false });
};

export const getBaggage = () => {
  return incarnation.fakeVomKit.cm.provideBaggage();
};

export const nextLife = () => {
  incarnation = reincarnate(incarnation);
};

// Setup the initial incarnation
annihilate();
