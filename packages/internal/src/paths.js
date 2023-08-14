import url from 'node:url';
import { resolve } from 'import-meta-resolve';

/**
 * @param {string} specifier
 * @param {string} parent
 * @returns {string}
 */
export const resolvePathname = (specifier, parent) => {
  const href = resolve(specifier, parent);
  return url.fileURLToPath(href);
};
