import { Fail } from '@endo/errors';

/**
 * @param {string} cacheDir
 * @param {{ now: typeof Date.now, fs: import('fs').promises, pathResolve: typeof import('path').resolve }} param1
 */
export const makeCacheAndGetBundleSpec =
  (cacheDir, { now, fs, pathResolve }) =>
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
      // FIXME: We could take a hard dependency on `tmp` here, but is it worth it?
      const tmpFile = `${cacheFile}.${now()}`;
      await fs.writeFile(tmpFile, JSON.stringify(bundle, null, 2), {
        flag: 'wx',
      });
      await fs.rename(tmpFile, cacheFile);
    }
    return harden({ bundleID, fileName: cacheFile });
  };
