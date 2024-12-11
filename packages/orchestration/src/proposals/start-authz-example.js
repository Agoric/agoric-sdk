/**
 * @file A proposal to start the authz examples contract.
 */
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

/**
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {AuthzExampleSF} from '../examples/authz-example.contract.js';
 */

const trace = makeTracer('StartAuthzExample', true);
const contractName = 'authzExample';

/**
 * See `@agoric/builders/builders/scripts/orchestration/init-authz-example.js`
 * for the accompanying proposal builder. Run `agoric run
 * packages/builders/scripts/orchestration/init-authz-example.js --chainInfo
 * 'chainName:CosmosChainInfo' --assetInfo 'denom:DenomDetail'` to build the
 * contract and proposal files.
 *
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       authzExample: Installation<AuthzExampleSF>;
 *     };
 *   };
 *   instance: {
 *     produce: {
 *       authzExample: Producer<Instance>;
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
export const startAuthzExample = async (
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
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(`start ${contractName}`);
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, contractName);
  const marshaller = await E(board).getPublishingMarshaller();

  /** @type {StartUpgradableOpts<AuthzExampleSF>} */
  const startOpts = {
    label: contractName,
    installation,
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
harden(startAuthzExample);

export const getManifestForContract = (
  { restoreRef },
  { installKeys, options },
) => {
  return {
    manifest: {
      [startAuthzExample.name]: {
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
      },
    },
    installations: {
      [contractName]: restoreRef(installKeys[contractName]),
    },
    options,
  };
};
