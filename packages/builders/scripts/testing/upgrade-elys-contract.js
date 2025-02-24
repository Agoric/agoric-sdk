/**
 * @file This is for use in tests in a3p-integration
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import {
  deeplyFulfilledObject,
  makeTracer,
  NonNullish,
} from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>
/**
 * @import {Instance} from '@agoric/zoe/src/zoeService/utils.js';
 */

const trace = makeTracer('UpgradeElysContract', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/elys.contract.js';
 */

/**
 * @param {BootstrapPowers & {
 *   instance: {
 *     consume: {
 *       elysContract: Instance<StartFn>;
 *     };
 *   };
 * }} powers
 * @param {...any} rest
 */
export const upgradeElysContract = async (
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
  { options: { elysContractRef } },
) => {
  trace(upgradeElysContract.name);

  const elysContractInstance = await instances.consume.elysContract;
  trace('elysContractInstance', elysContractInstance);
  const elysContractKit = await E(contractKits).get(elysContractInstance);

  const marshaller = await E(board).getReadonlyMarshaller();
  const storageNode = await makeStorageNodeChild(chainStorage, "ElysContract");
  const feeConfig = {
    feeCollector: 'agoric1feeCollectorAddress',
    onBoardRate: {
      nominator: BigInt(20),
      denominator: BigInt(100),
    }, // 20%
    offBoardRate: {
      nominator: BigInt(10),
      denominator: BigInt(100),
    }, // 10%
  }
  const allowedChains = ['cosmoshub'];
  

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode,
      timerService: chainTimerService,
      // undefined so `registerKnownChainsAndAssets` does not run again
      chainInfo: undefined,
      assetInfo: undefined,
      feeConfig,
      allowedChains,
    }),
  );

  trace('upgrading...');
  trace('ref', elysContractRef);
  await E(elysContractKit.adminFacet).upgradeContract(
    elysContractRef.bundleID,
    privateArgs,
  );

  trace('done');
};
harden(upgradeElysContract);

export const getManifestForValueVow = ({ restoreRef }, { elysContractRef }) => {
  console.log('elysContractRef', elysContractRef);
  return {
    manifest: {
      [upgradeElysContract.name]: {
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
          consume: { elysContract: true },
        },
        instance: {
          consume: { elysContract: true },
        },
      },
    },
    installations: {
        elysContract: restoreRef(elysContractRef),
    },
    options: {
        elysContractRef,
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/upgrade-elys-contract.js',
    getManifestCall: [
      'getManifestForValueVow',
      {
        elysContractRef: publishRef(
          install(
            '@agoric/orchestration/src/examples/elys.contract.js',
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
  await writeCoreEval(upgradeElysContract.name, defaultProposalBuilder);
};
