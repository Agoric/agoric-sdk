/* eslint-env node */

/**
 * Build a function that reads and parses a JSON file.
 *
 * @template [U=ReturnType<typeof JSON.parse>]
 * @param {Pick<typeof import('node:fs/promises'), 'readFile'>} fsp
 * @param {(input: ReturnType<typeof JSON.parse>) => U} [resultReplacer]
 */
export const makeReadJsonFile = ({ readFile }, resultReplacer) => {
  /** @type {(path: string) => Promise<U>} */
  const readJsonFile = async path => {
    await null;
    const result = JSON.parse(await readFile(path, 'utf8'));
    return resultReplacer ? resultReplacer(result) : /** @type {U} */ (result);
  };
  return readJsonFile;
};
