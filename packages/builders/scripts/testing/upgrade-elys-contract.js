/**
 * @file This is for use in tests in a3p-integration
 * Unlike most builder scripts, this one includes the proposal exports as well.
 */
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
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
 *       ElysContract: Instance<StartFn>;
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

  const elysContractInstance = await instances.consume.ElysContract;
  const elysContractKit = await E(contractKits).get(elysContractInstance);

  const marshaller = await E(board).getReadonlyMarshaller();
  const storageNode = await makeStorageNodeChild(chainStorage, 'ElysContract');
  const feeConfig = {
    feeCollector: 'agoric1euw2t0lxgeerlpj0tcy77f9syrmgx26ehdx3sq',
    onBoardRate: {
      numerator: BigInt(20),
      denominator: BigInt(100),
    }, // 20%
    offBoardRate: {
      numerator: BigInt(10),
      denominator: BigInt(100),
    }, // 10%
  };
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

  trace('upgrading Elys Contract...');
  await E(elysContractKit.adminFacet).upgradeContract(
    elysContractRef.bundleID,
    privateArgs,
  );

  trace('Upgrade done');
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
          consume: { ElysContract: true },
        },
        instance: {
          consume: { ElysContract: true },
        },
      },
    },
    installations: {
      ElysContract: restoreRef(elysContractRef),
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
          install('@agoric/orchestration/src/examples/elys.contract.js'),
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
