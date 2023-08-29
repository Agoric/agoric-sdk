import url from 'node:url';
import { resolve } from 'import-meta-resolve';

/**
 * @param {string} specifier
 * @param {string} base
 * @returns {string} file system absolute path of the package resource specifier
 */
export const resolvePath = (specifier, base) => {
  const href = resolve(specifier, base);
  return url.fileURLToPath(href);
};

export const makeResolvePath = base => {
  return specifier => resolvePath(specifier, base);
};
