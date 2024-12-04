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

/// <reference types="@agoric/vats/src/core/types-ambient"/>
/**
 * @import {Installation, Instance} from '@agoric/zoe/src/zoeService/utils.js';
 */

const trace = makeTracer('UpgradeSA', true);

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
export const upgradeSendAnywhere = async (
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
  trace(upgradeSendAnywhere.name);

  const saInstance = await instances.consume.sendAnywhere;
  trace('saInstance', saInstance);
  const saKit = await E(contractKits).get(saInstance);

  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode(
        'send-anywhere',
      ),
      timerService: chainTimerService,
      // undefined so `registerKnownChainsAndAssets` does not run again
      chainInfo: undefined,
      assetInfo: undefined,
    }),
  );

  trace('upgrading...');
  trace('ref', sendAnywhereRef);
  await E(saKit.adminFacet).upgradeContract(
    sendAnywhereRef.bundleID,
    privateArgs,
  );

  trace('done');
};
harden(upgradeSendAnywhere);

export const getManifestForValueVow = ({ restoreRef }, { sendAnywhereRef }) => {
  console.log('sendAnywhereRef', sendAnywhereRef);
  return {
    manifest: {
      [upgradeSendAnywhere.name]: {
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
    sourceSpec: '@agoric/builders/scripts/testing/upgrade-send-anywhere.js',
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

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(upgradeSendAnywhere.name, defaultProposalBuilder);
};
