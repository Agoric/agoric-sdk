import * as STORAGE_PATH from '@agoric/internal/src/chain-storage-paths.js';

import { Fail, q } from '@endo/errors';

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
export const exportStorage = (
  batchChainStorage,
  exportStorageSubtrees = [],
  clearStorageSubtrees = [],
) => {
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
};
