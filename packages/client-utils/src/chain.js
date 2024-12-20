import { intervalAsyncGenerator } from './clock-timer.js';

const { freeze } = Object;

/**
 * @import {StargateClient} from '@cosmjs/stargate';
 */

/**
 * @param {{
 *   client: StargateClient,
 *   delay: (ms: number) => Promise<void>,
 *   period?: number,
 *   retryMessage?: string,
 * }} opts
 * @returns {<T>(l: (b: { time: string, height: number }) => Promise<T>) => Promise<T>}
 */
export const pollBlocks = opts => async lookup => {
  const { client, delay, period = 3 * 1000 } = opts;
  const { retryMessage } = opts;

  await null; // separate sync prologue

  for (;;) {
    const status = await client.getBlock();
    const {
      header: { time, height },
    } = status;
    try {
      // see await null above
      const result = await lookup({ time, height });
      return result;
    } catch (_err) {
      console.error(
        time,
        retryMessage || 'not in block',
        height,
        'retrying...',
      );
      await delay(period);
    }
  }
};

/**
 * @import {CosmosAPI} from './grpc-rest-api.js';
 * @import {IntervalIO} from './clock-timer.js';
 */

/**
 * @param {CosmosAPI} api
 * @param {number} [delta]
 */
const recentBlockRate = async (api, delta = 2) => {
  const relevant = ({ height, time }) => ({ height, time });
  const { block: latest } = await queryBlock(api);
  const heightRecent = Number(latest.header.height) - delta;
  const { block: recent } = await queryBlock(api, heightRecent);
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
 *
 * @param {IntervalIO & { api: CosmosAPI}} io
 * @param {number} [io.delta]
 */
async function* iterateBlocks({ api, delta = 2, ...io }) {
  const { period } = await recentBlockRate(api, delta);
  const nyquist = period / 2;
  let prev;
  const ticks = intervalAsyncGenerator(nyquist, io);
  for await (const tick of ticks) {
    const { block } = await queryBlock(api);
    const current = Number(block.header.height);
    if (current === prev) continue;
    prev = current;
    const { time } = block.header;
    yield freeze({ tick, height: current, time });
  }
}
