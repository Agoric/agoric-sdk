/**
 * @file This is for use in tests in a3p-integration
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>
/**
 * @import {Installation} from '@agoric/zoe/src/zoeService/utils.js';
 */

const trace = makeTracer('StartValueVow', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       valueVow: Installation<
 *         import('@agoric/zoe/src/contracts/valueVow.contract.js').start
 *       >;
 *     };
 *   };
 * }} powers
 */
export const startValueVow = async ({
  consume: { startUpgradable },
  installation: {
    consume: { valueVow },
  },
  instance: {
    // @ts-expect-error unknown instance
    produce: { valueVow: produceInstance },
  },
}) => {
  trace(startValueVow.name);

  const startOpts = {
    label: 'valueVow',
    installation: valueVow,
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
  trace('done');
};
harden(startValueVow);

export const getManifestForValueVow = ({ restoreRef }, { valueVowRef }) => {
  console.log('valueVowRef', valueVowRef);
  return {
    manifest: {
      [startValueVow.name]: {
        consume: {
          startUpgradable: true,
        },
        installation: {
          consume: { valueVow: true },
        },
        instance: {
          produce: { valueVow: true },
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
    sourceSpec: '@agoric/builders/scripts/testing/start-valueVow.js',
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
  await writeCoreEval('start-valueVow', defaultProposalBuilder);
};
