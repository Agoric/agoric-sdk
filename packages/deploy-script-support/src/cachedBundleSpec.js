import { Fail } from '@endo/errors';
import pathAmbient from 'node:path';
import { makeFileRWResolve } from '@agoric/pola-io';

/**
 * @import {promises} from 'fs';
 * @import {resolve} from 'path';
 * @import {BundleSourceResult} from '@endo/bundle-source';
 */

/**
 * @param {string} cacheDir
 * @param {{ now: typeof Date.now, fs: promises, pathResolve: typeof resolve, pid?: number }} param1
 */
export const makeCacheAndGetBundleSpec =
  (cacheDir, { now, fs, pathResolve, pid = process.pid }) =>
  /**
   * @param {Promise<BundleSourceResult<'endoZipBase64'>>} bundleP
   */
  async bundleP => {
    const bundle = await bundleP;
    const { endoZipBase64Sha512: hash } = bundle;

    typeof hash === 'string' || Fail`bundle hash ${hash} must be a string`;
    const bundleID = `b1-${hash}`;
    const cacheDirRoot = makeFileRWResolve(pathResolve(cacheDir), {
      fsp: fs,
      path: pathAmbient,
    });
    const cacheFile = cacheDirRoot.join(`${bundleID}.json`);

    await cacheDirRoot.mkdir({ recursive: true });
    try {
      await cacheFile.readOnly().stat();
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
      await cacheFile.writeAtomic(JSON.stringify(bundle, null, 2), { now, pid });
    }
    return harden({ bundleID, fileName: String(cacheFile) });
  };
