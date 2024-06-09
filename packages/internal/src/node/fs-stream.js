import { createWriteStream } from 'node:fs';
import { open } from 'node:fs/promises';

/**
 * @param {import('fs').ReadStream | import('fs').WriteStream} stream
 * @returns {Promise<void>}
 */
export const fsStreamReady = stream =>
  new Promise((resolve, reject) => {
    if (stream.destroyed) {
      reject(Error('Stream already destroyed'));
      return;
    }

    if (!stream.pending) {
      resolve();
      return;
    }

    const onReady = () => {
      cleanup(); // eslint-disable-line no-use-before-define
      resolve();
    };

    /** @param {Error} err */
    const onError = err => {
      cleanup(); // eslint-disable-line no-use-before-define
      reject(err);
    };

    const cleanup = () => {
      stream.off('ready', onReady);
      stream.off('error', onError);
    };

    stream.on('ready', onReady);
    stream.on('error', onError);
  });

const noPath = /** @type {import('fs').PathLike} */ (
  /** @type {unknown} */ (undefined)
);

/** @typedef {NonNullable<Awaited<ReturnType<typeof makeFsStreamWriter>>>} FsStreamWriter */
/** @param {string | undefined | null} filePath */
export const makeFsStreamWriter = async filePath => {
  if (!filePath) {
    return undefined;
  }

  const handle = await open(filePath, 'a');

  const stream = createWriteStream(noPath, { fd: handle.fd });
  await fsStreamReady(stream);

  let flushed = Promise.resolve();
  let closed = false;

  const write = async data => {
    if (closed) {
      throw Error('Stream closed');
    }

    /** @type {Promise<void>} */
    const written = new Promise((resolve, reject) => {
      stream.write(data, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    flushed = flushed.then(
      () => written,
      async err =>
        Promise.reject(
          written.then(
            () => err,
            writtenError => AggregateError([err, writtenError]),
          ),
        ),
    );
    return written;
  };

  const flush = async () => {
    await flushed;
    await handle.sync().catch(err => {
      if (err.code === 'EINVAL') {
        return;
      }
      throw err;
    });
  };

  const close = async () => {
    closed = true;
    await flush();
    stream.close();
  };

  return harden({ write, flush, close });
};
