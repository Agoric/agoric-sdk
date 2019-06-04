import util from 'util';
import {resolve, basename} from 'path';
import {chmod as rawChmod, exists as rawExists, mkdir as rawMkdir,
  readFile as rawReadFile, stat as rawStat, writeFile as rawWriteFile} from 'fs';
import {Readable} from 'stream';

export const chmod = util.promisify(rawChmod);
export const exists = util.promisify(rawExists);
export const mkdir = util.promisify(rawMkdir);
export const writeFile = util.promisify(rawWriteFile);
export const readFile = util.promisify(rawReadFile);
export const stat = util.promisify(rawStat);
export {resolve, basename};

export const needNotExists = async (filename) => {
    if (await exists(filename)) {
      throw `${filename} already exists`;
    }
  };

export const createFile = (path, contents) => {
    console.log(`Creating ${path}`);
    return writeFile(path, contents);
}

export const streamFromString = (str) => {
  const s = new Readable();
  // s._read = () => {};
  s.push(str);
  s.push(null);
  return s;
}