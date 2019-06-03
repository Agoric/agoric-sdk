import util from 'util';
import {resolve, basename} from 'path';
import {mkdir as rawMkdir, stat as rawStat, writeFile as rawWriteFile} from 'fs';

export const mkdir = util.promisify(rawMkdir);
export const writeFile = util.promisify(rawWriteFile);
export {resolve, basename};

export const stat = (path) => new Promise((resolve, reject) => {
    rawStat(path, (err, stats) => {
        if (err) {
            return reject(err);
        }
        resolve(stats);
    });
});


export const needNotExists = async (filename) => {
    let exists;
    try {
      exists = await stat(filename);
    } catch (e) {}
    if (exists) {
      throw `${filename} already exists`;
    }
  };

export const createFile = (path, contents) => {
    console.log(`Creating ${path}`);
    return writeFile(path, contents);
}
