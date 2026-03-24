import { Fail } from '@endo/errors';
import { writeFileAtomic } from '@agoric/internal/src/build-cache.js';

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
    const cacheFile = pathResolve(cacheDir, `${bundleID}.json`);

    await fs.mkdir(cacheDir, { recursive: true });
    try {
      await fs.stat(cacheFile);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
      await writeFileAtomic({
        fs,
        filePath: cacheFile,
        data: JSON.stringify(bundle, null, 2),
        now,
        pid,
      });
    }
    return harden({ bundleID, fileName: cacheFile });
  };
