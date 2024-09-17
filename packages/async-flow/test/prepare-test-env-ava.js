import '@agoric/swingset-liveslots/tools/prepare-test-env.js';

import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import { environmentOptionsListHas } from '@endo/env-options';
import { wrapTest } from '@endo/ses-ava';
import rawTest from 'ava';

export const test = wrapTest(rawTest);

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

export const asyncFlowVerbose = () => {
  // TODO figure out how we really want to control this.
  return environmentOptionsListHas('DEBUG', 'async-flow-verbose');
};
