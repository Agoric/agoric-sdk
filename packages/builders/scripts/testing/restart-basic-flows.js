/**
 * @file This is for use in tests.
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import {
  deeplyFulfilledObject,
  makeTracer,
  NonNullish,
} from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>

const trace = makeTracer('RestartBasicFlows', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/basic-flows.contract.js';
 */

/**
 * @param {BootstrapPowers} powers
 */
export const restartBasicFlows = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService,
    cosmosInterchainService,
    localchain,

    contractKits,
  },
  instance: instances,
}) => {
  trace(restartBasicFlows.name);

  // @ts-expect-error unknown instance
  const instance = await instances.consume.basicFlows;
  trace('instance', instance);
  /** @type {StartedInstanceKit<StartFn>} */
  const kit = /** @type {any} */ (await E(contractKits).get(instance));

  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode(
        'basicFlows',
      ),
      timerService: chainTimerService,
    }),
  );

  await E(kit.adminFacet).restartContract(privateArgs);
  trace('done');
};
harden(restartBasicFlows);

export const getManifest = () => {
  return {
    manifest: {
      [restartBasicFlows.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          cosmosInterchainService: true,
          localchain: true,

          contractKits: true,
        },
        instance: {
          consume: { basicFlows: true },
        },
      },
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/restart-basic-flows.js',
    getManifestCall: [getManifest.name],
  });

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(restartBasicFlows.name, defaultProposalBuilder);
};
