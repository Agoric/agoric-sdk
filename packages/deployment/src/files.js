import { promisify, styleText } from 'node:util';
import { Readable } from 'node:stream';
import { mkdtemp } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';

import { Fail } from '@endo/errors';

const { freeze } = Object;

export const reading = (
  { exists, readFile, readdir, stat },
  { resolve, dirname, basename },
) => {
  const existsP = promisify(exists);
  return freeze({
    resolve,
    dirname,
    basename,
    readFile: promisify(readFile),
    readdir: promisify(readdir),
    stat: promisify(stat),
    exists: existsP,
    mustNotExist: async filename => {
      const fileExists = await existsP(filename);
      !fileExists || Fail`${filename} already exists`;
    },
  });
};

export const writing = (
  { rename, unlink, chmod, mkdir, writeFile },
  { basename },
) => {
  const it = freeze({
    chmod: promisify(chmod),
    mkdir: promisify(mkdir),
    writeFile: promisify(writeFile),
    unlink: promisify(unlink),
    rename: promisify(rename),

    createFile: async (filePath, contents) => {
      console.error(
        styleText('yellow', 'Creating ') +
          styleText(['yellow', 'underline'], filePath),
      );

      const name = basename(filePath);
      const tempDir = await mkdtemp(
        path.join(path.dirname(filePath), `${name}.`),
      );
      const tempPath = path.join(tempDir, name);

      try {
        await fs.promises.writeFile(tempPath, contents);
        await it.rename(tempPath, filePath);
      } catch (e) {
        try {
          await fs.promises.unlink(tempPath);
          await fs.promises.rmdir(tempDir);
        } catch (e2) {
          // do nothing
        }
        throw e;
      }

      try {
        await fs.promises.rmdir(tempDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    },
  });
  return it;
};

export const streamFromString = str => {
  const s = new Readable();
  // s._read = () => {};
  s.push(str);
  s.push(null);
  return s;
};
