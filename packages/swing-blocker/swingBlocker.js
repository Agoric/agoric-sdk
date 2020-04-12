// @ts-check

/**
 * @template T
 * @callback Blocker A blocker that waits for a new result
 * @returns {T} The result of this sync
 */

/**
 * @typedef {Object.<string, any>} BlockerMeta
 * @property {string} type the registered type
 */

/**
 * @typedef {Object} BlockerReturn
 * @property {BlockerMeta} meta the blocker's metadata
 * @property {() => void} cleanup free the blocker's resources
 */

/**
 * @template T
 * @callback Poller Return the results of the poll
 * @returns {T|undefined}
 */

/**
 * Create a blocker that polls.
 *
 * @template T
 * @param {Poller<T>} poll Return the results of the synchronization
 * @returns {Blocker<T>} the polling blocker
 */
export function makeBlocker(poll) {
  return () => {
    for (;;) {
      // Do the poll for the result.
      const result = poll();
      if (result !== undefined) {
        // We got something, so return.
        return result;
      }
    }
  };
}

/**
 * @type {Map<string, [(meta: BlockerMeta, poll: Poller<any>) => () => any, (meta: BlockerMeta) => () => void]>}
 */
const registry = new Map();

/**
 * Register blocker/unblocker makers.
 * @template T
 * @param {string} type the meta.type property
 * @param {(meta: BlockerMeta, poll: Poller<T>) => () => T} blockerFromMeta the blocker maker
 * @param {(meta: BlockerMeta) => () => void} [unblockerFromMeta=_meta => () => {}] the unblocker maker
 */
export function registerBlocker(
  type,
  blockerFromMeta,
  unblockerFromMeta = _meta => () => {},
) {
  if (registry.has(type)) {
    throw TypeError(`Registry already has an entry for ${type}`);
  }
  registry.set(type, [blockerFromMeta, unblockerFromMeta]);
}

/**
 * Construct a blocker from its metadata.
 * @template T
 * @param {BlockerMeta} meta the created metadata
 * @param {Poller<T>} poll the poll function
 * @returns {() => T} the blocker
 */
export function getBlockerFromMeta(meta, poll) {
  const { type } = meta;
  const entry = registry.get(type);
  if (!entry) {
    throw TypeError(`Cannot find registered type ${type}`);
  }
  const mkBlocker = entry[0];
  return mkBlocker(meta, poll);
}

/**
 * Construct an unblocker from its metadata.
 * @param {BlockerMeta} meta the created metadata
 * @returns {() => void} the unblocker
 */
export function getUnblockerFromMeta(meta) {
  const { type } = meta;
  const entry = registry.get(type);
  if (!entry) {
    throw TypeError(`Cannot find registered type ${type}`);
  }
  const mkUnblocker = entry[1];
  return mkUnblocker(meta);
}
