import { createWriteStream } from 'fs';
import { open } from 'fs/promises';
import { E } from '@endo/eventual-send';
import { fsStreamReady, makeAggregateError } from '@agoric/internal';
import { serializeSlogObj } from './serialize-slog-obj.js';

const noPath = /** @type {import('fs').PathLike} */ (
  /** @type {unknown} */ (undefined)
);

/** @param {import('./index.js').MakeSlogSenderOptions} opts */
export const makeSlogSender = async ({ env: { SLOGFILE } = {} } = {}) => {
  if (!SLOGFILE) {
    return undefined;
  }

  const handle = await open(SLOGFILE, 'a');

  const stream = createWriteStream(noPath, { fd: handle.fd });
  await fsStreamReady(stream);

  let flushed = Promise.resolve();

  const writeNewLine = () => {
    /** @type {Promise<void>} */
    const written = new Promise((resolve, reject) => {
      stream.write('\n', err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    flushed = E.when(
      flushed,
      () => written,
      async err =>
        Promise.reject(
          written.then(
            () => err,
            writtenError => makeAggregateError([err, writtenError]),
          ),
        ),
    );
  };

  const slogSender = (slogObj, jsonObj = serializeSlogObj(slogObj)) => {
    stream.write(jsonObj);
    writeNewLine();
  };

  return Object.assign(slogSender, {
    forceFlush: async () => {
      await flushed;
      await handle.sync().catch(err => {
        if (err.code === 'EINVAL') {
          return;
        }
        throw err;
      });
    },
    usesJsonObject: true,
  });
};
