/**
 * @file core eval to prune (presumably outdated) vstorage nodes.
 *
 * Use `vstorage-prune.build.js` to configure which nodes to prune.
 */

/**
 * @import {ChainStoragePresent} from './chain-info.core'
 */

import { makeTracer, zip } from '@agoric/internal';
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
    // on failure, trace rather than aborting the whole job
    const results = await Promise.allSettled(
      children.map(k =>
        E(E(parentNode).makeChildNode(k, { sequence: false })).setValue(''),
      ),
    );
    for (const [child, result] of zip(children, results)) {
      if (result.status === 'rejected') {
        trace('rejected:', parent, child, result.reason);
      }
    }
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
