//wip temp hacker do not merge
import {
  buildTimer,
  buildBridge,
  swingsetIsInitialized,
  initializeSwingset,
  makeSwingsetController,
  loadSwingsetConfigFile,
} from '@agoric/swingset-vat';
import { assert, Fail } from '@agoric/assert';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';

import { extractCoreProposalBundles } from '@agoric/deploy-script-support/src/extract-proposal.js';

import { exportStorage } from './export-storage-stripped.js';

const VERBOSE = true;

/**
 * @param {undefined | ((dstID: string, obj: any) => any)} bridgeOutbound
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {string} vatconfig absolute path
 * @param {unknown} bootstrapArgs JSON-serializable data
 * @param {{}} env
 * @param {*} options
 */
export async function buildSwingset(
  bridgeOutbound,
  kernelStorage,
  vatconfig,
  bootstrapArgs,
  env,
  { debugName = undefined },
) {
  const debugPrefix = debugName === undefined ? '' : `${debugName}:`;
  const config = await loadSwingsetConfigFile(vatconfig);
  if (!config) throw Fail`config not set`;

  const timer = buildTimer();
  config.devices = {
    timer: {
      sourceSpec: timer.srcPath,
    },
  };
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };

  if (bridgeOutbound) {
    const bd = buildBridge(bridgeOutbound);
    config.devices.bridge = {
      sourceSpec: bd.srcPath,
    };
    deviceEndowments.bridge = { ...bd.endowments };
  }

  async function ensureSwingsetInitialized() {
    if (swingsetIsInitialized(kernelStorage)) {
      return;
    }
    const {
      coreProposals,
      clearStorageSubtrees,
      exportStorageSubtrees = [],
      ...swingsetConfig
    } = /** @type {SwingSetConfig & CosmicSwingsetConfig} */ (config);

    const bootVat =
      swingsetConfig.vats[swingsetConfig.bootstrap || 'bootstrap'];

    // Find the entrypoints for all the core proposals.
    await null;
    if (coreProposals) {
      const { bundles, code } = await extractCoreProposalBundles(
        coreProposals,
        vatconfig, // for path resolution
      );
      swingsetConfig.bundles = { ...swingsetConfig.bundles, ...bundles };

      // Tell the bootstrap code how to run the core proposals.
      bootVat.parameters = { ...bootVat.parameters, coreProposalCode: code };
    }

    if (bridgeOutbound) {
      const batchChainStorage = (method, args) =>
        bridgeOutbound(BRIDGE_ID.STORAGE, { method, args });

      // Extract data from chain storage as [path, value?] pairs.
      const chainStorageEntries = exportStorage(
        batchChainStorage,
        exportStorageSubtrees,
        clearStorageSubtrees,
      );
      bootVat.parameters = { ...bootVat.parameters, chainStorageEntries };
    }

    swingsetConfig.pinBootstrapRoot = true;
    console.log(`@@@@ before initializeSwingset`);
    await initializeSwingset(swingsetConfig, bootstrapArgs, kernelStorage, {
      debugPrefix,
      verbose: VERBOSE,
    });
  console.log(`@@@@ after initializeSwingset`);
  }
  await ensureSwingsetInitialized();
  console.log(`@@@@ before makeSwingsetController`);
  const controller = await makeSwingsetController(
    kernelStorage,
    deviceEndowments,
    {
      env,
      verbose: VERBOSE,
    },
  );
  console.log(`@@@@ after makeSwingsetController`);

  return { controller };
}
