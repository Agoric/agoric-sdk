/**
 * @file enumerate [vstorage][vsmod] keys under `published.ymax` that are
 * older than the ymax0 instance in published.agoricNames.instance
 *
 * Motivation: each time we deploy to devnet, portfolios and such from
 * earlier deployments remain in vstorage, confusing clients.
 *
 * [vsmod]: https://github.com/Agoric/agoric-sdk/blob/ymax-v0.1-alpha/golang/cosmos/x/vstorage/README.md
 */
/* global globalThis */
import { fetchEnvNetworkConfig, makeVStorage } from '@agoric/client-utils';
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForPruneVStorage } from './vstorage-prune.core.js';
import { findOutdated } from './vstorage-outdated.js';

const sourceSpec = './vstorage-prune.core.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {PruneOpts} from './vstorage-prune.core';
 */

/**
 * @param {unknown} _utils
 * @param {PruneOpts} pruneOpts
 * @satisfies {CoreEvalBuilder}
 */
export const defaultProposalBuilder = async (_utils, pruneOpts) =>
  harden({
    sourceSpec,
    getManifestCall: [getManifestForPruneVStorage.name, { options: pruneOpts }],
  });

/** @type {DeployScriptFunction} */
export default async (
  homeP,
  endowments,
  { fetch = globalThis.fetch, env = process.env } = {},
) => {
  const config = await fetchEnvNetworkConfig({ env, fetch });
  const vs = makeVStorage({ fetch }, config);
  const toPrune = await findOutdated(vs);

  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('eval-vstorage-prune', utils =>
    defaultProposalBuilder(utils, harden({ toPrune })),
  );
};
