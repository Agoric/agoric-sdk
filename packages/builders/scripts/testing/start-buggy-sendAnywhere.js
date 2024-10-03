/**
 * @file This is for use in tests in a3p-integration
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import {
  deeplyFulfilledObject,
  makeTracer,
  NonNullish,
} from '@agoric/internal';
import { E, Far } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>
/**
 * @import {Installation} from '@agoric/zoe/src/zoeService/utils.js';
 */

const trace = makeTracer('StartBuggySA', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/send-anywhere.contract.js';
 */

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       sendAnywhere: Installation<StartFn>;
 *     };
 *   };
 * }} powers
 */
export const startSendAnywhere = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService,
    cosmosInterchainService,
    localchain,
    startUpgradable,
  },
  installation: {
    consume: { sendAnywhere },
  },
  instance: {
    // @ts-expect-error unknown instance
    produce: { sendAnywhere: produceInstance },
  },
}) => {
  trace(startSendAnywhere.name);

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

  /** @type {import('@agoric/vats').NameHub} */
  // @ts-expect-error intentional fake
  const agoricNamesHangs = Far('agoricNames that hangs', {
    lookup: async () => {
      trace('agoricNames.lookup being called that will never resolve');
      // BUG: this never resolves
      return new Promise(() => {});
    },
  });

  const { instance } = await E(startUpgradable)({
    label: 'sendAnywhere',
    installation: sendAnywhere,
    privateArgs: {
      ...privateArgs,
      agoricNames: agoricNamesHangs,
    },
  });
  produceInstance.resolve(instance);
  trace('done');
};
harden(startSendAnywhere);

export const getManifestForValueVow = ({ restoreRef }, { sendAnywhereRef }) => {
  trace('sendAnywhereRef', sendAnywhereRef);
  return {
    manifest: {
      [startSendAnywhere.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          cosmosInterchainService: true,
          localchain: true,

          startUpgradable: true,
        },
        installation: {
          consume: { sendAnywhere: true },
        },
        instance: {
          produce: { sendAnywhere: true },
        },
      },
    },
    installations: {
      sendAnywhere: restoreRef(sendAnywhereRef),
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/start-buggy-sendAnywhere.js',
    getManifestCall: [
      'getManifestForValueVow',
      {
        sendAnywhereRef: publishRef(
          install(
            '@agoric/orchestration/src/examples/send-anywhere.contract.js',
          ),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startSendAnywhere.name, defaultProposalBuilder);
};
