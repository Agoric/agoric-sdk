/* eslint-env node */
// @ts-check

/** @file test that the upgraded board can store and retrieve values. */

import '@endo/init/legacy.js';
import test from 'ava';
import { evalBundles } from '@agoric/synthetic-chain';

test('test upgraded board', async t => {
  // agoricProposal.sdk-generate in package.json generates this proposal
  await evalBundles('testUpgradedBoard');

  t.pass();
});
