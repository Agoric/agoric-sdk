/**
 * @file This is for use in tests in a3p-integration
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>

const trace = makeTracer('RestartSA', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/stake-ica.contract.js';
 */

/**
 * @param {BootstrapPowers} powers
 */
export const restartStakeAtom = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService,
    cosmosInterchainService,
    contractKits,
  },
  instance: instances,
}) => {
  trace(restartStakeAtom.name);

  const instance = await instances.consume.stakeAtom;
  trace('instance', instance);

  /** @type {StartedInstanceKit<StartFn>} */
  const kit = /** @type {any} */ (await E(contractKits).get(instance));

  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      cosmosInterchainService,
      storageNode: makeStorageNodeChild(chainStorage, 'stakeAtom'),
      marshaller,
      timer: chainTimerService,
    }),
  );

  await E(kit.adminFacet).restartContract(privateArgs);
  trace('done');
};
harden(restartStakeAtom);

export const getManifest = () => {
  return {
    manifest: {
      [restartStakeAtom.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          cosmosInterchainService: true,
          contractKits: true,
        },
        instance: {
          consume: { stakeAtom: true },
        },
      },
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/restart-stakeAtom.js',
    getManifestCall: [getManifest.name],
  });

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(restartStakeAtom.name, defaultProposalBuilder);
};
