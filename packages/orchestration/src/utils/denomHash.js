// @ts-check
import { sha256 } from '@noble/hashes/sha256';
// import { toHex } from '@cosmjs/encoding';

// ack: https://stackoverflow.com/a/40031979/7963
function toHex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

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
  return toHex(h).toUpperCase();
};
