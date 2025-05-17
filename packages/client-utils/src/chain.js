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
