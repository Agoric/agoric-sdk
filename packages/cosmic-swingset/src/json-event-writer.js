import { performance } from 'node:perf_hooks';

/** @param {import('@agoric/internal').FsStreamWriter | undefined} stream */
export const bufferStreamWrites = stream => {
  if (!stream) {
    return undefined;
  }

  /** @type {string[]} */
  const buffer = [];

  let closed = false;

  const write = async data => {
    if (closed) throw Error('Stream closed');

    buffer.push(data);
  };

  const flush = async () => {
    await buffer.splice(0).reduce(async (prev, data) => {
      await prev;
      await stream.write(data);
    }, Promise.resolve());

    await stream.flush();
  };

  const close = async () => {
    closed = true;
    await flush();
    await stream.close();
  };

  return harden({ write, flush, close });
};

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
