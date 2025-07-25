/**
 * @file core eval to prune (presumably outdated) vstorage nodes.
 *
 * Use `vstorage-prune.build.js` to configure which nodes to prune.
 */

/**
 * @import {ChainStoragePresent} from './chain-info.core'
 */

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';

const trace = makeTracer('VSP');

/**
 * @typedef {{
 *   toPrune: Record<string, string[]>
 * }} PruneOpts
 */

/**
 * @param {BootstrapPowers & ChainStoragePresent} permitted
 * @param {{options: PruneOpts}} config
 */
export const pruneVStorage = async (permitted, { options }) => {
  const { toPrune } = options;
  trace('toPrune', toPrune);
  const { chainStorage } = permitted.consume;

  /** @param {string[]} path */
  const makePathNode = path => {
    let node = chainStorage;
    for (const segment of path) {
      node = E(node).makeChildNode(segment);
    }
    return node;
  };

  await null;
  for (const [parent, children] of Object.entries(toPrune)) {
    const segments = parent.replace(/^published\./, '').split('.');
    const parentNode = makePathNode(segments);
    trace('pruning', parent, children);
    await Promise.all(
      children.map(k =>
        E(E(parentNode).makeChildNode(k, { sequence: false })).setValue(''),
      ),
    );
  }
  trace('done');
};
harden(pruneVStorage);

export const getManifestForPruneVStorage = (_u, { options }) => ({
  manifest: {
    [pruneVStorage.name]: {
      consume: {
        chainStorage: true,
      },
    },
  },
  options,
});
