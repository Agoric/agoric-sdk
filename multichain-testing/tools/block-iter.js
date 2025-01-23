import { makeIntervalIterable } from '@agoric/client-utils/src/clock-timer.js';

const { freeze } = Object;

/**
 * @import {IntervalIO} from '@agoric/client-utils/src/clock-timer.js';
 * @import {makeQueryClient} from './query.js';
 */

/**
 * @param {ReturnType<typeof makeQueryClient>} api
 * @param {number} [delta]
 */
const recentBlockRate = async (api, delta = 2) => {
  /** @param {{ height: number, time: string }} header */
  const relevant = ({ height, time }) => ({ height, time });
  const { block: latest } = await api.queryBlock();
  const heightRecent = Number(latest.header.height) - delta;
  const { block: recent } = await api.queryBlock(heightRecent);
  const t0 = Date.parse(recent.header.time);
  const t1 = Date.parse(latest.header.time);
  return {
    delta,
    latest: { ...relevant(latest.header) },
    recent: { ...relevant(recent.header) },
    elapsed: t1 - t0,
    period: (t1 - t0) / delta,
  };
};

/**
 * Make an iterator for observing each block.
 *
 * We measure the block rate by observing the latest block
 * and one earlier (by `delta`) block.
 *
 * Then we poll at 2x that rate (Nyquist frequency) and
 * fire the iterator when the height changes.
 *
 * @param {IntervalIO & { api: ReturnType<typeof makeQueryClient>, delta?: number }} io
 */
export const makeBlocksIterable = ({ api, delta = 2, ...io }) => {
  return freeze({
    async *[Symbol.asyncIterator]() {
      const { period } = await recentBlockRate(api, delta);
      const nyquist = period / 2;
      let prev;
      const ticks = makeIntervalIterable(nyquist, io);
      for await (const tick of ticks) {
        const { block } = await api.queryBlock();
        const current = Number(block.header.height);
        if (current === prev) continue;
        prev = current;
        const { time } = block.header;
        yield freeze({ tick, height: current, time });
      }
    },
  });
};
