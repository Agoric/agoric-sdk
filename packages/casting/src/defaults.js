// @ts-check
/* global setTimeout */
import { E, Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

/** @template T @typedef {import('@endo/far').ERef<T>} ERef */

/**
 * Default to the local chain.
 */
export const DEFAULT_BOOTSTRAP = 'http://localhost:26657';

export const DEFAULT_JITTER_SECONDS = 5;

export const DEFAULT_POLL_WITH_EVENTS_SECONDS = 600;

export const DEFAULT_KEEP_POLLING_SECONDS = 5;

/**
 * Resolve a Promise after a given number of milliseconds.
 *
 * @param {number} ms
 * @returns {ERef<void>}
 */
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @param {number} range
 * @param {number} [cap]
 */
export const randomBackoff = (range, cap = range) => {
  return Math.random() * Math.min(cap, range);
};

/**
 * @param {number} [attempt]
 * @param {number} [base]
 * @param {number} [cap]
 */
export const exponentialBackoff = (attempt = 0, base = 1_000, cap = 30_000) => {
  return randomBackoff(2 ** attempt * base, cap);
};

/**
 * Add a little to the retry delay to avoid a thundering herd.
 *
 * @param {string} where
 * @returns {ERef<void>}
 */
export const DEFAULT_JITTER = where => {
  const jitter = randomBackoff(DEFAULT_JITTER_SECONDS * 1_000);
  console.warn(`jittering ${where} by ${Math.ceil(jitter)}ms`);
  return delay(jitter);
};

/**
 * Report an error, then retry the leader operation after a second or two.
 *
 * @param {string} where
 * @param {any} err
 * @param {number} [attempt]
 * @returns {ERef<void>}
 */
export const DEFAULT_RETRY_CALLBACK = (where, err, attempt = 0) => {
  const backoff = exponentialBackoff(attempt);
  console.warn(
    `retrying ${where} in ${Math.ceil(backoff)}ms after attempt #${attempt}`,
    err,
  );
  return delay(backoff);
};

/**
 * Return true after we want to be sure we received latest state something.
 *
 * @returns {ERef<boolean>}
 */
export const DEFAULT_KEEP_POLLING = () =>
  E.when(
    delay(randomBackoff(DEFAULT_KEEP_POLLING_SECONDS * 1_000)),
    () => true,
  );

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
