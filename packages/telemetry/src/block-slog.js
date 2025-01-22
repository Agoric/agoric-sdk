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
  /**
   * @type {Awaited<ReturnType<typeof makeFsStreamWriter>> | null}
   */
  let lastBlockStream = null;

  /**
   * Immediately frees the `currentStream` assignment and lazily closes the open file stream
   */
  const closeStream = () => {
    if (currentStream) {
      const streamClosePromise = currentStream.close();
      currentStream = null;
      return streamClosePromise;
    } else console.error('No stream to close');
  };

  /**
   * @param {string} fileName
   */
  const createFileStream = async fileName => {
    if (currentStream)
      throw Error(`Stream already open on file ${currentStream.filePath}`);

    const filePath = `${options.stateDir || CONTEXTUAL_BLOCK_SLOGS}/slogfile_${fileName}.jsonl`;
    currentStream = await makeFsStreamWriter(filePath);

    if (!currentStream)
      throw Error(`Couldn't create a write stream on file "${filePath}"`);
  };

  /**
   * @param {import('./context-aware-slog.js').Slog} slog
   */
  const slogSender = async slog => {
    await new Promise(resolve => resolve(null));

    const { blockHeight, type: slogType } = slog;

    switch (slogType) {
      case SLOG_TYPES.KERNEL.INIT.START: {
        createFileStreamPromise = createFileStream(
          `init_${new Date().getTime()}`,
        );
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BOOTSTRAP_BLOCK.START: {
        createFileStreamPromise = createFileStream(
          `bootstrap_${new Date().getTime()}`,
        );
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BEGIN_BLOCK: {
        createFileStreamPromise = createFileStream(
          `block_${blockHeight}_${new Date().getTime()}`,
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

    writeSlogToStream(
      contextualSlog,
      slogType === SLOG_TYPES.COSMIC_SWINGSET.AFTER_COMMIT_STATS
        ? lastBlockStream
        : currentStream,
    )?.catch(console.error);

    switch (slogType) {
      case SLOG_TYPES.KERNEL.INIT.FINISH:
      case SLOG_TYPES.COSMIC_SWINGSET.BOOTSTRAP_BLOCK.FINISH: {
        closeStream()?.catch(console.error);
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.COMMIT.FINISH: {
        lastBlockStream = currentStream;
        currentStream = null;
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.AFTER_COMMIT_STATS: {
        lastBlockStream
          ?.close()
          .catch(console.error)
          .finally(() => (lastBlockStream = null));
        break;
      }
      default: {
        break;
      }
    }
  };

  /**
   * @param {ReturnType<contextualSlogProcessor>} slog
   * @param {Awaited<ReturnType<typeof makeFsStreamWriter>> | null} stream
   */
  const writeSlogToStream = (slog, stream) =>
    !stream
      ? console.error(`No stream available for slog type "${slog.body.type}"`) // eslint-disable-next-line prefer-template
      : stream.write(serializeSlogObj(slog) + '\n');

  return Object.assign(slogSender, {
    forceFlush: () => currentStream?.flush(),
    shutdown: closeStream,
  });
};
