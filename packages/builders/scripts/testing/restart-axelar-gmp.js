/**
 * @file This is for use in tests in a3p-integration
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import {
  deeplyFulfilledObject,
  makeTracer,
  NonNullish,
} from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('StartAxelarGmp', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/axelar-gmp.contract.js';
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/**
 * @param {BootstrapPowers} powers
 */
export const restartAxelarGmp = async ({
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
  trace(restartAxelarGmp.name);

  const marshaller = await E(board).getReadonlyMarshaller();
  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode('axelarGmp'),
      timerService: chainTimerService,
    }),
  );

  // @ts-expect-error unknown instance
  const instance = await instances.consume.axelarGmp;
  trace('instance', instance);
  /** @type {StartedInstanceKit<StartFn>} */
  const kit = /** @type {any} */ (await E(contractKits).get(instance));

  await E(kit.adminFacet).restartContract(privateArgs);
  trace('done');
};
harden(restartAxelarGmp);

export const getManifest = () => {
  return {
    manifest: {
      [restartAxelarGmp.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainTimerService: true,
          chainStorage: true,
          cosmosInterchainService: true,
          localchain: true,
          contractKits: true,
        },
        instance: {
          consume: { axelarGmp: true },
        },
      },
    },
  };
};

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/builders/scripts/testing/restart-axelar-gmp.js',
    getManifestCall: [getManifest.name],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(restartAxelarGmp.name, defaultProposalBuilder);
};
