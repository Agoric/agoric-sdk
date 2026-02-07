import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { mkdtemp, writeFile, unlink } from 'node:fs/promises';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import chalk from 'chalk';

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
  { dirname, basename },
) => {
  const it = freeze({
    chmod: promisify(chmod),
    mkdir: promisify(mkdir),
    writeFile: promisify(writeFile),
    unlink: promisify(unlink),
    rename: promisify(rename),

    createFile: async (filePath, contents) => {
      console.error(chalk.yellow(`Creating ${chalk.underline(filePath)}`));

      // Create temp file with Node native fs.mkdtemp
      const dir = dirname(filePath);
      const name = basename(filePath);
      const tempDir = await mkdtemp(path.join(tmpdir(), `${name}.`));
      const tempPath = path.join(tempDir, name);

      try {
        // Write the contents and rename
        await writeFile(tempPath, contents);
        await it.rename(tempPath, filePath);
      } catch (e) {
        // Unlink on error
        try {
          await unlink(tempPath);
          await fs.promises.rmdir(tempDir);
        } catch (e2) {
          // do nothing
        }
        throw e;
      }

      // Clean up temp directory
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
