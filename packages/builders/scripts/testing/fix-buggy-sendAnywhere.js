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
 * @import {Installation, Instance} from '@agoric/zoe/src/zoeService/utils.js';
 */

const trace = makeTracer('FixBuggySA', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/send-anywhere.contract.js';
 */

/**
 * @param {BootstrapPowers & {
 *   instance: {
 *     consume: {
 *       sendAnywhere: Instance<StartFn>;
 *     };
 *   };
 * }} powers
 * @param {...any} rest
 */
export const fixSendAnywhere = async (
  {
    consume: {
      agoricNames,
      board,
      chainStorage,
      chainTimerService,
      contractKits,
      cosmosInterchainService,
      localchain,
    },
    instance: instances,
  },
  { options: { sendAnywhereRef } },
) => {
  trace(fixSendAnywhere.name);

  const saInstance = await instances.consume.sendAnywhere;
  trace('saInstance', saInstance);
  const saKit = await E(contractKits).get(saInstance);

  const marshaller = await E(board).getReadonlyMarshaller();

  // This apparently pointless wrapper is to maintain structural parity
  // with the buggy core-eval's wrapper to make lookup() hang.
  const agoricNamesResolves = Far('agoricNames that resolves', {
    lookup: async (...args) => {
      return E(agoricNames).lookup(...args);
    },
  });

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames: agoricNamesResolves,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode(
        'sendAnywhere',
      ),
      timerService: chainTimerService,
    }),
  );

  trace('upgrading...');
  await E(saKit.adminFacet).upgradeContract(
    sendAnywhereRef.bundleID,
    privateArgs,
  );

  trace('done');
};
harden(fixSendAnywhere);

export const getManifestForValueVow = ({ restoreRef }, { sendAnywhereRef }) => {
  console.log('sendAnywhereRef', sendAnywhereRef);
  return {
    manifest: {
      [fixSendAnywhere.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          cosmosInterchainService: true,
          localchain: true,

          contractKits: true,
        },
        installation: {
          consume: { sendAnywhere: true },
        },
        instance: {
          consume: { sendAnywhere: true },
        },
      },
    },
    installations: {
      sendAnywhere: restoreRef(sendAnywhereRef),
    },
    options: {
      sendAnywhereRef,
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/fix-buggy-sendAnywhere.js',
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
  await writeCoreEval(fixSendAnywhere.name, defaultProposalBuilder);
};
