import { finished as streamFinishedCallback, Readable } from 'node:stream';
import { promisify } from 'node:util';
import { createGzip } from 'node:zlib';
import { withDeferredCleanup } from '@agoric/internal/src/node/utils.js';

const streamFinished = promisify(streamFinishedCallback);

/*
 * @param {string} dirPath
 * @param {object} powers
 * @param {Pick<import('fs'), 'createWriteStream' | 'mkdirSync' | 'renameSync'>} powers.fs
 * @param {Pick<import('path'), 'join'>} powers.path
 * @param {Pick<import('tmp'), 'fileSync'>} powers.tmp
 */
export const makeArchiveTranscript = (dirPath, powers) => {
  const { fs, path, tmp } = powers;
  fs.mkdirSync(dirPath, { recursive: true });
  const archiveTranscript = (spanName, entries) => {
    const destPath = path.join(dirPath, `${spanName}.gz`);
    return withDeferredCleanup(async addCleanup => {
      const {
        name: tmpName,
        fd,
        removeCallback,
      } = tmp.fileSync({
        prefix: spanName,
        postfix: '.gz',
        detachDescriptor: true,
      });
      addCleanup(() => removeCallback());
      const writer = fs.createWriteStream('', { fd, flush: true });
      const gzip = createGzip();
      gzip.pipe(writer);
      const reader = Readable.from(entries);
      const destroyReader = promisify(reader.destroy.bind(reader));
      addCleanup(() => destroyReader(null));
      reader.pipe(gzip);
      await streamFinished(gzip);
      fs.renameSync(tmpName, destPath);
    });
  };
  return archiveTranscript;
};
harden(makeArchiveTranscript);