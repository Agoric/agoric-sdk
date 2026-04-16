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

const trace = makeTracer('StartSA', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/send-anywhere.contract.js';
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
 * @import {StartedInstanceKit} from '@agoric/zoe/src/zoeService/utils.js';
 */

/**
 * @param {BootstrapPowers} powers
 */
export const restartSendAnywhere = async ({
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
  trace(restartSendAnywhere.name);

  // @ts-expect-error unknown instance
  const instance = await instances.consume.sendAnywhere;
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
        'sendAnywhere',
      ),
      timerService: chainTimerService,
    }),
  );

  await E(kit.adminFacet).restartContract(privateArgs);
  trace('done');
};
harden(restartSendAnywhere);

export const getManifest = () => {
  return {
    manifest: {
      [restartSendAnywhere.name]: {
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
          consume: { sendAnywhere: true },
        },
      },
    },
  };
};

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/restart-send-anywhere.js',
    getManifestCall: [getManifest.name],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(restartSendAnywhere.name, defaultProposalBuilder);
};
