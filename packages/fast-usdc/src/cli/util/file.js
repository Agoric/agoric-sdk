import { dirname } from 'node:path';

/**
 * @import {readFile} from 'node:fs/promises';
 * @import {writeFile} from 'node:fs/promises';
 * @import {mkdirSync} from 'node:fs';
 * @import {existsSync} from 'node:fs';
 */

/** @typedef {typeof readFile} readAsync */
/** @typedef {typeof writeFile} writeAsync */
/** @typedef {typeof mkdirSync} mkdirSync */
/** @typedef {typeof existsSync} existsSync */

export const makeFile = (
  /** @type {string} */ path,
  /** @type {readAsync} */ readFile,
  /** @type {writeAsync} */ writeFile,
  /** @type {mkdirSync} */ mkdir,
  /** @type {existsSync} */ pathExists,
) => {
  const read = () => readFile(path, 'utf-8');

  const write = async (/** @type {string} */ data) => {
    const dir = dirname(path);
    if (!pathExists(dir)) {
      mkdir(dir);
    }
    await writeFile(path, data);
  };

  const exists = () => pathExists(path);

  return { read, write, exists, path };
};

/** @typedef {ReturnType<typeof makeFile>} File */
