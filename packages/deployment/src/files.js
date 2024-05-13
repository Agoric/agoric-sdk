import { promisify } from 'util';
import { Readable } from 'stream';
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
  { write, close, rename, unlink, chmod, mkdir, writeFile },
  { dirname, basename },
  { open: tempOpen },
) => {
  const fsWrite = promisify(write);
  const fsClose = promisify(close);
  const it = freeze({
    chmod: promisify(chmod),
    mkdir: promisify(mkdir),
    writeFile: promisify(writeFile),
    unlink: promisify(unlink),
    rename: promisify(rename),

    createFile: async (path, contents) => {
      console.error(chalk.yellow(`Creating ${chalk.underline(path)}`));
      const info = await new Promise((res, rej) => {
        tempOpen(
          { dir: dirname(path), prefix: `${basename(path)}.` },
          (err, tmpInfo) => {
            if (err) {
              rej(err);
              return;
            }
            res(tmpInfo);
          },
        );
      });
      try {
        // Write the contents, close, and rename.
        await fsWrite(info.fd, contents);
        await fsClose(info.fd);
        await it.rename(info.path, path);
      } catch (e) {
        // Unlink on error.
        try {
          await it.unlink(info.path);
        } catch (e2) {
          // do nothing
        }
        throw e;
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
