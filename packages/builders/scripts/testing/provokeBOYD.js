/**
 * @file call getTimerBrand() 300 times in hopes of provoking BOYD. This is
 * intended for tests on mainFork for upgrade-18. If there's a similar need in
 * other tests, it can be included there as well. There would be no value in
 * including it in an upgrade of MainNet; it just spins cycles to provoke
 * garbage collection.
 */

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>
/** @import {Instance} from '@agoric/zoe/src/zoeService/utils.js'; */

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

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/builders/scripts/testing/provokeBOYD.js',
    getManifestCall: ['getManifestForProvokeBOYD'],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(provokeBOYD.name, defaultProposalBuilder);
};
