// @ts-check
/* global setTimeout */
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

/**
 * Default to the local chain.
 */
export const DEFAULT_BOOTSTRAP = 'http://localhost:26657';

/**
 * Resolve a Promise after a given number of milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Report an error, then retry the leader operation after a second or two.
 *
 * @param {any} err
 * @param {number} _attempt
 * @returns {Promise<void>}
 */
export const DEFAULT_RETRY_CALLBACK = (err, _attempt = 0) => {
  console.warn('retrying after error', err);
  // TODO: `delay(Math.random() * Math.min(cap, base * 2 ** attempt))
  return delay(1000 + Math.random() * 1000);
};

/**
 * Return true after we want to be sure we received latest state something.
 *
 * @returns {Promise<boolean>}
 */
export const DEFAULT_KEEP_POLLING = () =>
  // TOOD: Remove this when the event-driven stuff is in place.
  delay(5000 + Math.random() * 1000).then(() => true);
// ... and uses this instead.
// delay(10 * 60 * 1000 + Math.random() * 60_000).then(() => true);

export const MAKE_DEFAULT_DECODER = () => {
  const td = new TextDecoder();
  /**
   * Decode utf-8 bytes, then parse the resulting JSON.
   *
   * @param {Uint8Array} buf
   */
  return harden(buf => {
    const str = td.decode(buf);
    return harden(JSON.parse(str));
  });
};

/**
 * Unserialize the JSONable data.
 *
 * @type {() => import('./types').Unserializer}
 */
export const MAKE_DEFAULT_UNSERIALIZER = () => {
  const ifaceAllegedPrefix = 'Alleged: ';
  const ifaceInaccessiblePrefix = 'SEVERED: ';
  const seen = new Map();
  const slotToVal = (slot, iface) => {
    // Private object.
    if (seen.has(slot)) {
      return seen.get(slot);
    }
    if (typeof iface === 'string' && iface.startsWith(ifaceAllegedPrefix)) {
      iface = iface.slice(ifaceAllegedPrefix.length);
    }
    const obj = Far(`${ifaceInaccessiblePrefix}${iface}`, {});
    seen.set(slot, obj);
    return obj;
  };
  return Far('marshal unserializer', {
    unserialize: makeMarshal(undefined, slotToVal).unserialize,
  });
};
