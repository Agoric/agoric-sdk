import { Fail, q } from '@endo/errors';
import { buildBridge } from '@agoric/swingset-vat';
import { BridgeId, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import * as STORAGE_PATH from '@agoric/internal/src/chain-storage-paths.js';
import { extractCoreProposalBundles } from '@agoric/deploy-script-support/src/extract-proposal.js';

/**
 * Export any specified storage subtrees, then delete the ones marked to clear.
 *
 * @param {(method: string, args: unknown[]) => any} batchChainStorage send a
 * batch command over the chain storage bridge
 * @param {string[]} [exportStorageSubtrees] chain storage paths identifying
 *   roots of subtrees for which data should be exported into bootstrap vat
 *   parameter `chainStorageEntries` (e.g., `exportStorageSubtrees: ['c.o']`
 *   might result in vatParameters including `chainStorageEntries: [ ['c.o',
 *   '"top"'], ['c.o.i'], ['c.o.i.n', '42'], ['c.o.w', '"moo"'] ]`).
 * @param {string[]} [clearStorageSubtrees] chain storage paths identifying
 *   roots of subtrees for which data should be deleted (TODO: including
 *   overlaps with exportStorageSubtrees, which are *not* preserved).
 */
function exportStorage(
  batchChainStorage,
  exportStorageSubtrees = [],
  clearStorageSubtrees = [],
) {
  const chainStorageEntries = [];

  const isInSubtree = (path, root) =>
    path === root || path.startsWith(`${root}.`);

  const singleChainStorage = (method, path) =>
    batchChainStorage(method, [path]);

  {
    // Disallow exporting internal details like bundle contents and the action queue.
    const exportRoot = STORAGE_PATH.CUSTOM;
    const badPaths = exportStorageSubtrees.filter(
      path => !isInSubtree(path, exportRoot),
    );
    badPaths.length === 0 ||
      // prettier-ignore
      Fail`Exported chain storage paths ${q(badPaths)} must start with ${q(exportRoot)}`;

    const makeExportEntry = (path, value) =>
      value == null ? [path] : [path, value];

    // Preserve the ordering of each subtree via depth-first traversal.
    let pendingEntries = exportStorageSubtrees.map(path => {
      const value = singleChainStorage('get', path);
      return makeExportEntry(path, value);
    });
    while (pendingEntries.length > 0) {
      const entry = /** @type {[string, string?]} */ (pendingEntries.shift());
      chainStorageEntries.push(entry);
      const [path, _value] = entry;
      const childEntryData = singleChainStorage('entries', path);
      const childEntries = childEntryData.map(([pathSegment, value]) => {
        return makeExportEntry(`${path}.${pathSegment}`, value);
      });
      pendingEntries = [...childEntries, ...pendingEntries];
    }
  }

  {
    // Clear other chain storage data as configured.
    // NOTE THAT WE DO NOT LIMIT THIS TO THE CUSTOM PATH!
    // USE AT YOUR OWN RISK!
    const pathsToClear = [];
    const batchThreshold = 100;
    const sendBatch = () => {
      // Consume pathsToClear and map each path to a no-value entry.
      const args = pathsToClear.splice(0).map(path => [path]);
      batchChainStorage('setWithoutNotify', args);
    };
    let pathsToCheck = [...clearStorageSubtrees];
    while (pathsToCheck.length > 0) {
      const path = pathsToCheck.shift();
      pathsToClear.push(path);
      if (pathsToClear.length >= batchThreshold) {
        sendBatch();
      }
      const childPaths = singleChainStorage('children', path).map(
        segment => `${path}.${segment}`,
      );
      pathsToCheck = [...childPaths, ...pathsToCheck];
    }
    if (pathsToClear.length > 0) {
      sendBatch();
    }
  }

  return chainStorageEntries;
}

export async function initEmulatedChain(config, configPath) {
  const chainStorage = makeFakeStorageKit('swingset-runner');
  let lastNonce = 0n;

  // cribbed from packages/vats/test/bootstrapTests/support.js
  function bridgeOutbound(bridgeId, obj) {
    switch (bridgeId) {
      case BridgeId.BANK: {
        // bridgeOutbound bank : {
        //   moduleName: 'vbank/reserve',
        //   type: 'VBANK_GET_MODULE_ACCOUNT_ADDRESS'
        // }
        switch (obj.type) {
          case 'VBANK_GET_MODULE_ACCOUNT_ADDRESS': {
            const { moduleName } = obj;
            const moduleDescriptor = Object.values(VBankAccount).find(
              ({ module }) => module === moduleName,
            );
            if (!moduleDescriptor) {
              return 'undefined';
            }
            return moduleDescriptor.address;
          }

          // Observed message:
          // address: 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346',
          // denom: 'ibc/toyatom',
          // type: 'VBANK_GET_BALANCE'
          case 'VBANK_GET_BALANCE': {
            // TODO consider letting config specify vbank assets
            // empty balances for test.
            return '0';
          }

          case 'VBANK_GRAB':
          case 'VBANK_GIVE': {
            lastNonce += 1n;
            // Also empty balances.
            return harden({
              type: 'VBANK_BALANCE_UPDATE',
              nonce: `${lastNonce}`,
              updated: [],
            });
          }

          default: {
            return 'undefined';
          }
        }
      }
      case BridgeId.CORE:
      case BridgeId.DIBC:
      case BridgeId.PROVISION:
      case BridgeId.PROVISION_SMART_WALLET:
      case BridgeId.WALLET:
        console.warn('Bridge returning undefined for', bridgeId, ':', obj);
        return undefined;
      case BridgeId.STORAGE:
        return chainStorage.toStorage(obj);
      default:
        throw Error(`unknown bridgeId ${bridgeId}`);
    }
  }

  const {
    coreProposals,
    clearStorageSubtrees,
    exportStorageSubtrees = [],
  } = config;

  const bootVat = config.vats[config.bootstrap];
  await null;
  if (coreProposals) {
    const { bundles, codeSteps } = await extractCoreProposalBundles(
      coreProposals,
      configPath,
    );
    config.bundles = { ...config.bundles, ...bundles };
    bootVat.parameters = {
      ...bootVat.parameters,
      coreProposalCodeSteps: codeSteps,
    };
  }

  const batchChainStorage = (method, args) =>
    bridgeOutbound(BridgeId.STORAGE, { method, args });

  // Extract data from chain storage as [path, value?] pairs.
  const chainStorageEntries = exportStorage(
    batchChainStorage,
    exportStorageSubtrees,
    clearStorageSubtrees,
  );
  bootVat.parameters = { ...bootVat.parameters, chainStorageEntries };

  return buildBridge(bridgeOutbound);
}
