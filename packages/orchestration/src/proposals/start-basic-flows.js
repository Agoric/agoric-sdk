/**
 * @file A proposal to start the basic flows contract.
 */
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

/**
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {BasicFlowsSF} from '../examples/basic-flows.contract.js';
 */

const trace = makeTracer('StartBasicFlows', true);
const contractName = 'basicFlows';

/**
 * See `@agoric/builders/builders/scripts/orchestration/init-basic-flows.js` for
 * the accompanying proposal builder. Run `agoric run
 * packages/builders/scripts/orchestration/init-basic-flows.js --chainInfo
 * 'chainName:CosmosChainInfo' --assetInfo 'denom:DenomDetail'` to build the
 * contract and proposal files.
 *
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       basicFlows: Installation<BasicFlowsSF>;
 *     };
 *   };
 *   instance: {
 *     produce: {
 *       basicFlows: Producer<Instance>;
 *     };
 *   };
 *   issuer: {
 *     consume: {
 *       BLD: Issuer<'nat'>;
 *       IST: Issuer<'nat'>;
 *       USDC: Issuer<'nat'>;
 *     };
 *   };
 * }} powers
 * @param {{
 *   options: {
 *     chainInfo: Record<string, CosmosChainInfo>;
 *     assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
 *   };
 * }} config
 */
export const startBasicFlows = async (
  {
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
      consume: { [contractName]: installation },
    },
    instance: {
      produce: { [contractName]: produceInstance },
    },
    issuer: {
      consume: { BLD, IST },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(`start ${contractName}`);
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, contractName);
  const marshaller = await E(board).getPublishingMarshaller();

  /** @type {StartUpgradableOpts<BasicFlowsSF>} */
  const startOpts = {
    label: 'basicFlows',
    installation,
    issuerKeywordRecord: {
      BLD: await BLD,
      IST: await IST,
    },
    terms: undefined,
    privateArgs: {
      agoricNames: await agoricNames,
      orchestrationService: await cosmosInterchainService,
      localchain: await localchain,
      storageNode,
      marshaller,
      timerService: await chainTimerService,
      chainInfo,
      assetInfo,
    },
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startBasicFlows);

export const getManifestForContract = (
  { restoreRef },
  { installKeys, options },
) => {
  return {
    manifest: {
      [startBasicFlows.name]: {
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
          consume: { [contractName]: true },
        },
        instance: {
          produce: { [contractName]: true },
        },
        issuer: {
          consume: { BLD: true, IST: true },
        },
      },
    },
    installations: {
      [contractName]: restoreRef(installKeys[contractName]),
    },
    options,
  };
};
