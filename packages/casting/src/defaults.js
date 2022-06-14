// @ts-check
/* global setTimeout */
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

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

/**
 * Decode utf-8 bytes, then parse the resulting JSON.
 *
 * @param {Uint8Array} buf
 */
export const DEFAULT_DECODER = harden(buf => {
  const td = new TextDecoder();
  const str = td.decode(buf);
  return harden(JSON.parse(str));
});

const ifaceAllegedPrefix = 'Alleged: ';
const ifaceInaccessiblePrefix = 'INACCESSIBLE: ';
const slotToVal = (_slot, iface) => {
  // Private object.
  if (typeof iface === 'string' && iface.startsWith(ifaceAllegedPrefix)) {
    iface = iface.slice(ifaceAllegedPrefix.length);
  }
  return Far(`${ifaceInaccessiblePrefix}${iface}`, {});
};

/**
 * Unserialize the JSONable data.
 *
 * @type {import('./types').Unserializer}
 */
export const DEFAULT_UNSERIALIZER = Far('marshal unserializer', {
  unserialize: makeMarshal(undefined, slotToVal).unserialize,
});
