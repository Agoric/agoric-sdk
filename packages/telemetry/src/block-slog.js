/* eslint-env node */

import { open } from 'node:fs/promises';
import { SLOG_TYPES } from './context-aware-slog.js';
import { serializeSlogObj } from './serialize-slog-obj.js';

/**
 * @typedef {import('./context-aware-slog.js').Slog} Slog
 */

/**
 * @param {import('./index.js').MakeSlogSenderOptions} options
 */
export const makeSlogSender = async options => {
  const { CONTEXTUAL_BLOCK_SLOGS } = options.env || {};
  if (!(options.stateDir || CONTEXTUAL_BLOCK_SLOGS))
    return console.error(
      'Ignoring invocation of slogger "block-slog" without the presence of "stateDir" or "CONTEXTUAL_BLOCK_SLOGS"',
    );

  let chainedPromises = Promise.resolve();
  /**
   * @type {import('node:fs/promises').FileHandle | null}
   */
  let currentFileHandle = null;
  /**
   * @type {import('node:fs').WriteStream | null}
   */
  let currentStream = null;

  /**
   * @param {Array<() => Promise<void>>} promises
   */
  const chainPromises = (...promises) =>
    // eslint-disable-next-line github/array-foreach
    promises.forEach(
      promise => (chainedPromises = chainedPromises.then(promise)),
    );

  const closeStream = async () => {
    if (currentStream)
      return new Promise(resolve =>
        currentStream?.close(err => {
          if (err) console.error("Couldn't close stream due to error: ", err);
          resolve(undefined);
        }),
      )
        .then(() => {
          currentStream = null;
        })
        .then(() => currentFileHandle?.close())
        .then(() => {
          currentFileHandle = null;
        });
    else {
      console.error('No stream to close');
      return Promise.resolve();
    }
  };

  /**
   * @param {string} fileName
   */
  const createFileStream = async fileName => {
    if (currentStream) throw Error('Stream already open');

    const filePath = `${options.stateDir || CONTEXTUAL_BLOCK_SLOGS}/slogfile_${fileName}.jsonl`;
    currentFileHandle = await open(filePath, 'w');
    currentStream = currentFileHandle.createWriteStream({
      autoClose: true,
      encoding: 'utf-8',
    });

    if (!currentStream)
      throw Error(`Couldn't create a write stream on file "${filePath}"`);
  };

  /**
   * @param {Slog} slog
   */
  const slogSender = slog => {
    const { blockHeight, type: slogType } = slog;

    switch (slogType) {
      case SLOG_TYPES.KERNEL.INIT.START: {
        chainPromises(() => createFileStream(`init_${new Date().getTime()}`));
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BOOTSTRAP_BLOCK.START: {
        chainPromises(() =>
          createFileStream(`bootstrap_${new Date().getTime()}`),
        );
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BEGIN_BLOCK: {
        chainPromises(() =>
          createFileStream(`block_${blockHeight}_${new Date().getTime()}`),
        );
        break;
      }
      default: {
        break;
      }
    }

    chainPromises(() => writeSlogToStream(slog));

    switch (slogType) {
      case SLOG_TYPES.KERNEL.INIT.FINISH:
      case SLOG_TYPES.COSMIC_SWINGSET.BOOTSTRAP_BLOCK.FINISH:
      case SLOG_TYPES.COSMIC_SWINGSET.AFTER_COMMIT_STATS: {
        chainPromises(closeStream);
        break;
      }
      default: {
        break;
      }
    }
  };

  /**
   * @param {Slog} slog
   * @returns {Promise<void>}
   */
  const writeSlogToStream = slog =>
    new Promise(resolve => {
      if (!currentStream) {
        console.error(`No stream available for slog type "${slog.type}"`);
        resolve();
      } else {
        // eslint-disable-next-line prefer-template
        const message = serializeSlogObj(slog) + '\n';

        const wrote = currentStream.write(message);
        if (!wrote) {
          console.warn('Stream full, waiting for drain');
          currentStream.once('drain', () => {
            currentStream?.write(message);
            resolve();
          });
        } else resolve();
      }
    });

  return Object.assign(slogSender, {
    forceFlush: () => chainedPromises,
    shutdown: closeStream,
  });
};
