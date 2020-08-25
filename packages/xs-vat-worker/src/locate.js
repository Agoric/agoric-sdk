/**
 * Locate the XS vat worker executable.
 *
 * Note: executable is not built by default.
 * @see the `build:xs-lin` script in package.json
 *
 * @param {{ resolve: (...string) => string }} filesystem path access
 * @returns { string } full path where linux debug executable is built;
 *                     not guaranteed to exist.
 */
export function locateWorkerBin({ resolve }) {
  const goal = 'debug'; // ISSUE: support, test release too?
  const os = 'lin'; // ISSUE: support, test mac too?
  return resolve(__dirname, '../build/bin', os, goal, 'xs-vat-worker');
}
