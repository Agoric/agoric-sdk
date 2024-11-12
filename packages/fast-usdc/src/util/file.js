import { dirname } from 'path';

/** @typedef {import('node:fs/promises').readFile} readAsync */
/** @typedef {import('node:fs/promises').writeFile} writeAsync */
/** @typedef {import('node:fs').mkdirSync} mkdirSync */
/** @typedef {import('node:fs').existsSync} existsSync */

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

/** @typedef {ReturnType<typeof makeFile>} file */
