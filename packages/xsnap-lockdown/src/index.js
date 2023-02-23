import fs from 'fs';
import { bundlePaths } from './paths.js';

export { lockdownBundleSHA256 } from '../dist/lockdown.bundle.sha256.js';

/**
 * @param { boolean } debug
 * @typedef {{ moduleFormat: string, source: string, sourceMap: [string] }} Bundle
 * @returns { Promise<Bundle> }
 */
const getBundle = async debug => {
  const path = debug ? bundlePaths.lockdownDebug : bundlePaths.lockdown;
  const bundleStringP = fs.promises.readFile(path, { encoding: 'utf-8' });
  return bundleStringP
    .catch(err => {
      console.error(`lockdown bundle not present at ${path}`);
      console.error(`perhaps run 'yarn build' in @agoric/xsnap-lockdown`);
      throw err;
    })
    .then(bundleString => JSON.parse(bundleString));
};

export const getLockdownBundle = () => getBundle(false);
export const getDebugLockdownBundle = () => getBundle(true);
