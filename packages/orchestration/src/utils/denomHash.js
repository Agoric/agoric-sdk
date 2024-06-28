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
