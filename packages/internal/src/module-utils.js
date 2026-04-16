import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { search } from '@endo/compartment-mapper';
import { Fail } from '@endo/errors';

/**
 * Given a file URL, return a deep import specifier that starts with the
 * specifier for its containing module (e.g., the deep import specifier for this
 * file is expected to be "@agoric/internal/src/module-utils.js").
 *
 * @param {string} fileUrl
 * @returns {Promise<string>}
 */
export const getSpecifier = async fileUrl => {
  // eslint-disable-next-line no-new
  new URL(fileUrl); // validates fileUrl
  const read = async location => {
    const path = fileURLToPath(new URL(location, fileUrl));
    return readFile(path);
  };
  const searchResult = await search(read, fileUrl);
  const { packageDescriptorText, moduleSpecifier } = searchResult;
  const { name } = JSON.parse(packageDescriptorText);
  name || Fail`containing package must have a name`;
  return `${name}/${moduleSpecifier.replace(/^\.\//, '')}`;
};
harden(getSpecifier);

/**
 * Given an import specifier and importer URL (usually import.meta.url), return
 * a file system path corresponding with the specifier for the importer.
 *
 * @param {string} specifier
 * @param {string} baseURL
 * @returns {string}
 */
export const resolveToPath = (specifier, baseURL) => {
  const resolved = importMetaResolve(specifier, baseURL);
  const resolvedURL = new URL(resolved);
  return fileURLToPath(resolvedURL);
};
harden(resolveToPath);
