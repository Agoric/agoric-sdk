/**
 * @file call getTimerBrand() 300 times in hopes of provoking BOYD. This is
 * intended for tests on mainFork for upgrade-18. If there's a similar need in
 * other tests, it can be included there as well. There would be no value in
 * including it in an upgrade of MainNet; it just spins cycles to provoke
 * garbage collection.
 */

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient.js"/>
/**
 * @import {Instance} from '@agoric/zoe/src/zoeService/utils.js';
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

const trace = makeTracer('provokeBOYD', true);

/**
 * @param {BootstrapPowers} powers
 */
export const provokeBOYD = async ({ consume: { chainTimerService } }) => {
  trace(provokeBOYD.name);
  await null;

  for (let i = 0; i < 300; i += 1) {
    await E(chainTimerService).getTimerBrand();
  }
  trace('done');
};
harden(provokeBOYD);

export const getManifestForProvokeBOYD = () => {
  return {
    manifest: {
      [provokeBOYD.name]: {
        consume: { chainTimerService: true },
      },
    },
  };
};

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/builders/scripts/testing/provokeBOYD.js',
    getManifestCall: ['getManifestForProvokeBOYD'],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const avoidBundling = '@agoric/deploy-script-support';
  const dspModule = await import(avoidBundling);
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(provokeBOYD.name, defaultProposalBuilder);
};
