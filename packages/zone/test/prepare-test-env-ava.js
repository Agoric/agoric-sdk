import '@agoric/swingset-liveslots/tools/prepare-test-env.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';

import test from 'ava';

export { test };

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
