/* eslint-env node */

import { makeFsStreamWriter } from '@agoric/internal/src/node/fs-stream.js';
import {
  makeContextualSlogProcessor,
  SLOG_TYPES,
} from './context-aware-slog.js';
import getContextFilePersistenceUtils, {
  DEFAULT_CONTEXT_FILE,
} from './context-aware-slog-persistent-util.js';
import { serializeSlogObj } from './serialize-slog-obj.js';

/**
 * @typedef {import('./context-aware-slog.js').Slog} Slog
 * @typedef {ReturnType<ReturnType<typeof makeContextualSlogProcessor>>} ContextSlog
 */

/**
 * @param {import('./index.js').MakeSlogSenderOptions} options
 */
export const makeSlogSender = async options => {
  const { CHAIN_ID, CONTEXTUAL_BLOCK_SLOGS } = options.env || {};
  if (!(options.stateDir || CONTEXTUAL_BLOCK_SLOGS))
    return console.error(
      'Ignoring invocation of slogger "block-slog" without the presence of "stateDir" or "CONTEXTUAL_BLOCK_SLOGS"',
    );

  const persistenceUtils = getContextFilePersistenceUtils(
    process.env.SLOG_CONTEXT_FILE_PATH ||
      `${options.stateDir}/${DEFAULT_CONTEXT_FILE}`,
  );

  const contextualSlogProcessor = makeContextualSlogProcessor(
    { 'chain-id': CHAIN_ID },
    persistenceUtils,
  );
  /**
   * @type {ReturnType<typeof createFileStream> | null}
   */
  let createFileStreamPromise = null;
  /**
   * @type {Awaited<ReturnType<typeof makeFsStreamWriter>> | null}
   */
  let currentStream = null;

  const closeStream = async () => {
    await new Promise(resolve => resolve(null));

    if (currentStream) {
      await currentStream.close();
      currentStream = null;
    } else console.error('No stream to close');
  };

  /**
   * @param {string} fileName
   */
  const createFileStream = async fileName => {
    const filePath = `${options.stateDir || CONTEXTUAL_BLOCK_SLOGS}/slogfile_${fileName}.jsonl`;
    currentStream = await makeFsStreamWriter(filePath);

    if (!currentStream)
      throw Error(`Couldn't create a write stream on file "${filePath}"`);
  };

  const ignore = () => {};

  /**
   * @param {import('./context-aware-slog.js').Slog} slog
   */
  const slogSender = async slog => {
    await new Promise(resolve => resolve(null));

    const { type: slogType } = slog;

    switch (slogType) {
      case SLOG_TYPES.KERNEL.INIT.START: {
        createFileStreamPromise = createFileStream(
          `init_${new Date().getTime()}`,
        );
        break;
      }
      default: {
        break;
      }
    }

    const contextualSlog = contextualSlogProcessor(slog);

    if (createFileStreamPromise) await createFileStreamPromise;
    createFileStreamPromise = null;

    if (currentStream)
      currentStream // eslint-disable-next-line prefer-template
        .write(serializeSlogObj(contextualSlog) + '\n')
        .catch(ignore);
    else console.error(`No stream found for logging slog "${slogType}"`);

    switch (slogType) {
      case SLOG_TYPES.KERNEL.INIT.FINISH: {
        await closeStream();
        break;
      }
      default: {
        break;
      }
    }
  };

  return Object.assign(slogSender, {
    forceFlush: () => currentStream?.flush(),
    shutdown: closeStream,
  });
};
