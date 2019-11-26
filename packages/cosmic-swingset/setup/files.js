import util from 'util';
import { resolve, basename, dirname } from 'path';
import {
  chmod as rawChmod,
  exists as rawExists,
  mkdir as rawMkdir,
  readFile as rawReadFile,
  stat as rawStat,
  writeFile as rawWriteFile,
  readdir as rawReaddir,
  write as rawWrite,
  close as rawClose,
  unlink as rawUnlink,
  rename as rawRename,
} from 'fs';
import { Readable } from 'stream';
import { open as tempOpen } from 'temp';
import chalk from 'chalk';

export const chmod = util.promisify(rawChmod);
export const exists = util.promisify(rawExists);
export const mkdir = util.promisify(rawMkdir);
export const writeFile = util.promisify(rawWriteFile);
export const readFile = util.promisify(rawReadFile);
export const readdir = util.promisify(rawReaddir);
export const stat = util.promisify(rawStat);
export const unlink = util.promisify(rawUnlink);
export const rename = util.promisify(rawRename);
const fsWrite = util.promisify(rawWrite);
const fsClose = util.promisify(rawClose);
export { resolve, dirname, basename };

export const needNotExists = async filename => {
  if (await exists(filename)) {
    throw `${filename} already exists`;
  }
};

export const createFile = async (path, contents) => {
  console.error(chalk.yellow(`Creating ${chalk.underline(path)}`));
  const info = await new Promise((resolve, reject) => {
    tempOpen({ dir: dirname(path), prefix: `${basename(path)}.` }, function(
      err,
      info,
    ) {
      if (err) {
        return reject(err);
      }
      resolve(info);
    });
  });
  try {
    // Write the contents, close, and rename.
    await fsWrite(info.fd, contents);
    await fsClose(info.fd);
    await rename(info.path, path);
  } catch (e) {
    // Unlink on error.
    try {
      await unlink(info.path);
    } catch (e2) {}
    throw e;
  }
};

export const streamFromString = str => {
  const s = new Readable();
  // s._read = () => {};
  s.push(str);
  s.push(null);
  return s;
};
