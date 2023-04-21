import { makeFsStreamWriter } from '@agoric/internal/src/node/fs-stream.js';
import { serializeSlogObj } from './serialize-slog-obj.js';

/** @param {import('./index.js').MakeSlogSenderOptions} opts */
export const makeSlogSender = async ({ env: { SLOGFILE } = {} } = {}) => {
  const stream = await makeFsStreamWriter(SLOGFILE);

  if (!stream) {
    return undefined;
  }

  const slogSender = (slogObj, jsonObj = serializeSlogObj(slogObj)) => {
    // eslint-disable-next-line prefer-template
    void stream.write(jsonObj + '\n');
  };

  return Object.assign(slogSender, {
    forceFlush: async () => stream.flush(),
    shutdown: async () => stream.close(),
    usesJsonObject: true,
  });
};
