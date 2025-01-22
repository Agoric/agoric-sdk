import { createWriteStream } from 'node:fs';
import process from 'node:process';
import { open } from 'node:fs/promises';

/**
 * @param {import('fs').ReadStream
 *   | import('fs').WriteStream
 *   | import('net').Socket} stream
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
      cleanup();
      resolve();
    };

    /** @param {Error} err */
    const onError = err => {
      cleanup();
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
  if (!filePath) return undefined;

  const isStdOutStream = filePath === '-';

  const handle = await (isStdOutStream ? undefined : open(filePath, 'a'));

  const stream = isStdOutStream
    ? process.stdout
    : createWriteStream(noPath, { autoClose: false, fd: handle.fd });
  await fsStreamReady(stream);

  let flushed = Promise.resolve();
  let closed = false;

  const updateFlushed = p => {
    flushed = flushed.then(
      () => p,
      err =>
        p.then(
          () => Promise.reject(err),
          pError =>
            Promise.reject(
              pError !== err ? AggregateError([err, pError]) : err,
            ),
        ),
    );
    flushed.catch(() => {});
  };

  const write = async data => {
    /** @type {Promise<void>} */
    const written = closed
      ? Promise.reject(Error('Stream closed'))
      : new Promise((resolve, reject) => {
          stream.write(data, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
    updateFlushed(written);
    return written;
  };

  const flush = async () => {
    await flushed;
    if (!isStdOutStream)
      await handle.sync().catch(err => {
        if (err.code === 'EINVAL') {
          return;
        }
        throw err;
      });
  };

  const close = async () => {
    // TODO: Consider creating a single Error here to use a write rejection
    closed = true;
    await flush();

    if (!isStdOutStream) {
      await new Promise(resolve => stream.end(resolve));
      await handle?.close();
    }
  };

  stream.on('error', err => updateFlushed(Promise.reject(err)));

  return harden({ close, filePath, flush, write });
};
