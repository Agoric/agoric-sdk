// @ts-check
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * cf. https://tutorials.cosmos.network/tutorials/6-ibc-dev/
 *
 * @param {object} opts
 * @param {string} [opts.portId]
 * @param {string} [opts.channelId] required unless `path` is supplied
 * @param {string} [opts.path] alternative to portId, channelId
 * @param {string} opts.denom base denom
 */
export const denomHash = ({
  portId = 'transfer',
  channelId = /** @type {string | undefined} */ (undefined),
  path = `${portId}/${channelId}`,
  denom,
}) => {
  const h = sha256.create().update(`${path}/${denom}`).digest();
  return bytesToHex(h).toUpperCase();
};

/**
 * Calculates denomHash from a full denomination path string
 * 
 * @param {string} fullPath - String in format "${path}/${denom}" (e.g. "transfer/channel-1/utia")
 * @returns {string} The hash of the denomination path
 * @throws {Error} If the path format is invalid
 */
export const denomHashFromPath = (fullPath) => {
  if (!fullPath || !fullPath.includes('/')) {
    throw new Error('Invalid path format: expected "${path}/${denom}"');
  }

  const lastSlashIndex = fullPath.lastIndexOf('/');
  const path = fullPath.substring(0, lastSlashIndex);
  const denom = fullPath.substring(lastSlashIndex + 1);

  if (!path || !denom) {
    throw new Error('Invalid path format: path or denom component is empty');
  }

  return denomHash({ path, denom });
};