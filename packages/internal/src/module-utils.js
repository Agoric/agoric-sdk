import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { search } from '@endo/compartment-mapper';
import { Fail } from '@endo/errors';

/**
 * Get a deep-import specifier for a file, starting with the specifier for its
 * containing module.
 *
 * @param {string} fileUrl
 * @returns {Promise<string>}
 */
export const getSpecifier = async fileUrl => {
  const read = async location => {
    const path = fileURLToPath(new URL(location, fileUrl));
    return readFile(path);
  };
  const searchResult = await search(read, fileUrl);
  const { packageDescriptorText, moduleSpecifier } = searchResult;
  const { name } = JSON.parse(packageDescriptorText);
  name || Fail`file package has no name`;
  return `${name}/${moduleSpecifier}`;
};
harden(getSpecifier);
