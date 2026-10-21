import fs from 'node:fs';
import { bundlePaths, hashPaths } from './paths.js';

const read = (name, path) => {
  return fs.promises.readFile(path, { encoding: 'utf-8' }).catch(err => {
    console.error(`unable to read lockdown ${name} at ${path}`);
    console.error(`perhaps run 'yarn build' in @agoric/xsnap-lockdown`);
    throw err;
  });
};

/**
 * @param { boolean } debug
 * @returns { Promise<string> }
 */
const getBundleSHA256 = async debug => {
  const path = debug ? hashPaths.lockdownDebug : hashPaths.lockdown;
  return read('hash', path).then(data => data.trim());
};

export const getLockdownBundleSHA256 = () => getBundleSHA256(false);
export const getDebugLockdownBundleSHA256 = () => getBundleSHA256(true);

/**
 * @param { boolean } debug
 * @typedef {{ moduleFormat: string, source: string, sourceMap: [string] }} Bundle
 * @returns { Promise<Bundle> }
 */
const getBundle = async debug => {
  const path = debug ? bundlePaths.lockdownDebug : bundlePaths.lockdown;
  return read('bundle', path).then(bundleString => JSON.parse(bundleString));
};

export const getLockdownBundle = () => getBundle(false);
export const getDebugLockdownBundle = () => getBundle(true);
