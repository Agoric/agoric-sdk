/* eslint-env node */

import { makeFsStreamWriter } from '@agoric/internal/src/node/fs-stream.js';
import { makeContextualSlogProcessor } from './context-aware-slog.js';
import getContextFilePersistenceUtils, {
  DEFAULT_CONTEXT_FILE,
} from './context-aware-slog-persistent-util.js';
import { serializeSlogObj } from './serialize-slog-obj.js';

/**
 * @typedef {import('./context-aware-slog.js').Slog} Slog
 * @typedef {ReturnType<ReturnType<typeof makeContextualSlogProcessor>>} ContextSlog
 */

const BLOCK_STREAM_HANDLERS_WINDOW = 5;
const CLEANUP_INTERVAL = 20000;
const DEFAULT_BLOCK_HEIGHT = -1;

/**
 * @param {import('./index.js').MakeSlogSenderOptions} options
 */
export const makeSlogSender = async options => {
  const { CHAIN_ID } = options.env || {};
  if (!options.stateDir)
    return console.error(
      'Ignoring invocation of slogger "block-slog" without the presence of "stateDir"',
    );

  let currentBlock = DEFAULT_BLOCK_HEIGHT;
  /**
   * @type {NodeJS.Timeout}
   */
  let cleanupRef;
  /**
   * @type {{[key: string]: Awaited<ReturnType<typeof makeFsStreamWriter>>}}
   */
  const streamHandlers = {};

  /**
   * @type {{[key: string]: ReturnType<typeof createBlockStream>}}
   */
  const streamCreationPromises = {};

  const persistenceUtils = getContextFilePersistenceUtils(
    process.env.SLOG_CONTEXT_FILE_PATH ||
      `${options.stateDir}/${DEFAULT_CONTEXT_FILE}`,
  );

  /**
   * @param {Awaited<ReturnType<typeof makeFsStreamWriter>>} stream
   */
  const closeFileStream = async stream => {
    if (!stream) return console.error('Trying to close a null stream');

    await stream.close();
  };

  const contextualSlogProcessor = makeContextualSlogProcessor(
    { 'chain-id': CHAIN_ID },
    persistenceUtils,
  );

  /**
   * @param {ContextSlog['attributes']['block.height']} blockHeight
   * @param {import('./index.js').MakeSlogSenderOptions['stateDir']} directory
   * @param {ContextSlog['time']} time
   */
  const createBlockStream = async (blockHeight, directory, time) => {
    if (blockHeight === undefined)
      throw Error('Block Height required for creating the write stream');

    const fileName = `${directory}/${blockHeight}-${time}.json`;
    const stream = await makeFsStreamWriter(
      `${directory}/${blockHeight}-${time}.json`,
    );

    if (!stream)
      throw Error(`Couldn't create a write stream on file "${fileName}"`);

    streamHandlers[String(blockHeight)] = stream;
  };

  const regularCleanup = async () => {
    if (currentBlock !== DEFAULT_BLOCK_HEIGHT)
      await Promise.all(
        Object.keys(streamHandlers).map(async streamIdentifier => {
          if (
            Number(streamIdentifier) <
              currentBlock - BLOCK_STREAM_HANDLERS_WINDOW ||
            Number(streamIdentifier) >
              currentBlock + BLOCK_STREAM_HANDLERS_WINDOW
          ) {
            await closeFileStream(streamHandlers[streamIdentifier]);
            delete streamHandlers[streamIdentifier];
            delete streamCreationPromises[streamIdentifier];
          }
        }),
      );

    cleanupRef = setTimeout(regularCleanup, CLEANUP_INTERVAL);
  };

  await regularCleanup();

  /**
   * @param {import('./context-aware-slog.js').Slog} slog
   */
  const slogSender = async slog => {
    const contextualSlog = contextualSlogProcessor(slog);
    const blockHeight = contextualSlog.attributes['block.height'];
    const blockHeightString = String(blockHeight);

    if (blockHeight !== undefined && currentBlock !== blockHeight) {
      if (!(blockHeightString in streamHandlers)) {
        if (!(blockHeightString in streamCreationPromises))
          streamCreationPromises[blockHeightString] = createBlockStream(
            blockHeight,
            options.stateDir,
            contextualSlog.time,
          );

        await streamCreationPromises[blockHeightString];
      }

      currentBlock = blockHeight;
    }

    if (currentBlock !== DEFAULT_BLOCK_HEIGHT) {
      const stream = streamHandlers[String(currentBlock)];
      if (!stream)
        throw Error(`Stream not found for block height ${currentBlock}`);

      stream.write(serializeSlogObj(contextualSlog) + '\n').catch(() => {});
    }
  };

  return Object.assign(slogSender, {
    forceFlush: () => streamHandlers[String(currentBlock)]?.flush(),
    shutdown: () => {
      clearTimeout(cleanupRef);
      return Promise.all(
        Object.entries(streamHandlers).map(([, stream]) =>
          closeFileStream(stream),
        ),
      );
    },
  });
};
