import url from 'node:url';
import { resolve } from 'import-meta-resolve';

/**
 * @param {string} specifier
 * @returns {string} file system absolute path of the package resource specifier
 */
export const pkgAbsPath = specifier => {
  const href = resolve(specifier, import.meta.url);
  return url.fileURLToPath(href);
};
