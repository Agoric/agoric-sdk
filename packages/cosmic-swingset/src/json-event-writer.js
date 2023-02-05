import { performance } from 'node:perf_hooks';

/** @param {{write: (data: string) => Promise<void>}} stream */
export const makeJSONEventWriter = stream => {
  return harden({
    /**
     * @param {object} obj
     * @returns {Promise<void>}
     */
    write: async obj => {
      // This may not match swingset time, but we don't care
      const time = Date.now() / 1000;
      // this is CLOCK_MONOTONIC, seconds since process start
      const monotime = performance.now() / 1000;
      return stream.write(
        // eslint-disable-next-line prefer-template
        JSON.stringify({ ...obj, time, monotime }, (_key, value) =>
          typeof value === 'bigint' ? Number(value) : value,
        ) + '\n',
      );
    },
  });
};
