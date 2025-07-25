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
import { NonNullish } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { getManifestForPruneVStorage } from './vstorage-prune.core.js';

const sourceSpec = './vstorage-prune.core.js';

/**
 * @import { StreamCell } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { VStorage } from '@agoric/client-utils';
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

/**
 * @param {VStorage} vs
 * @param {string} start
 */
async function* depthFirst(vs, start) {
  /** @param {string} current */
  async function* visit(current) {
    const children = await vs.keys(current);
    for (const child of children) {
      yield* visit(`${current}.${child}`);
    }
    yield current;
  }

  yield* visit(start);
}

/** @param {VStorage} vs */
const findOutdated = async vs => {
  const verbose = false; // XXX cli flag
  const debug = verbose ? console.debug : () => {};

  /** @param {string} path */
  const getHeightLast = async path => {
    debug('read', path);
    // const raw = await vs.readStorage(path);
    // console.debug({ path, raw });

    const { blockHeight, values } = /** @type {StreamCell<'string'>} */ (
      await vs.readAt(path)
    );
    return { blockHeight: Number(blockHeight), last: values.at(-1) };
  };

  const { blockHeight: t0, last } = await getHeightLast(
    'published.agoricNames.instance',
  );
  (last && last.includes('ymax0')) || Fail`no ymax0 instance`;
  console.error('published.agoricNames.instance blockHeight', t0);

  /** @type {PruneOpts['toPrune']} */
  const toPrune = {};

  const noData = ['.portfolios', '.flows', '.positions'];
  for await (const path of depthFirst(vs, 'published.ymax0.portfolios')) {
    if (noData.some(tail => path.endsWith(tail))) continue;
    const { blockHeight: age } = await getHeightLast(path);
    const ok = age >= t0;
    debug({ path, age, t0, ok });
    if (!ok) {
      const parts = path.split('.');
      const child = NonNullish(parts.at(-1));
      const parent = parts.slice(0, -1).join('.');
      if (!(parent in toPrune)) {
        toPrune[parent] = [];
      }
      toPrune[parent].push(child);
    }
  }
  return harden(toPrune);
};

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
