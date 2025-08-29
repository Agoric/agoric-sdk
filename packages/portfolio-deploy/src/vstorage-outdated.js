import { NonNullish } from '@agoric/internal';
import { throwRedacted as Fail } from '@endo/errors';

/**
 * @import { StreamCell } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { VStorage } from '@agoric/client-utils';
 * @import {PruneOpts} from './vstorage-prune.core';
 */

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
export const findOutdated = async vs => {
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
