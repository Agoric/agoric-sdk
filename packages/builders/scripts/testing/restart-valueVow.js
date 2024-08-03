/**
 * @file This is for use in tests in a3p-integration
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>
/**
 * @import {Instance} from '@agoric/zoe/src/zoeService/utils.js';
 */

const trace = makeTracer('RestartValueVow', true);

/**
 * @param {BootstrapPowers & {
 *   instance: {
 *     consume: {
 *       valueVow: Instance<
 *         import('@agoric/zoe/src/contracts/valueVow.contract.js').start
 *       >;
 *     };
 *   };
 * }} powers
 */
export const restartValueVow = async ({
  consume: { contractKits },
  instance: instances,
}) => {
  trace(restartValueVow.name);

  const vvInstance = await instances.consume.valueVow;
  trace('vvInstance', vvInstance);
  const vvKit = await E(contractKits).get(vvInstance);

  await E(vvKit.adminFacet).restartContract({});
  trace('done');
};
harden(restartValueVow);

export const getManifestForValueVow = ({ restoreRef }, { valueVowRef }) => {
  console.log('valueVowRef', valueVowRef);
  return {
    manifest: {
      [restartValueVow.name]: {
        consume: {
          contractKits: true,
        },
        instance: {
          consume: { valueVow: true },
        },
      },
    },
    installations: {
      valueVow: restoreRef(valueVowRef),
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/restart-valueVow.js',
    getManifestCall: [
      'getManifestForValueVow',
      {
        valueVowRef: publishRef(
          install('@agoric/zoe/src/contracts/valueVow.contract.js'),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(restartValueVow.name, defaultProposalBuilder);
};
