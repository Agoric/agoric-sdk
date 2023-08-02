import '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';

export { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

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
