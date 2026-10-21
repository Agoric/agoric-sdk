/**
 * @typedef {(bundleSpecPath: string) => string} ReadText
 */

/**
 * @param {ReadText} readText
 * @param {string} bundleSpecPath
 */
export const parseBundleSpec = (readText, bundleSpecPath) =>
  JSON.parse(readText(bundleSpecPath));
