// @ts-check

/**
 * @template T
 * @callback Blocker A blocker that waits for a new result
 * @returns {T} The result of this sync
 */

/**
 * @typedef {Object.<string, any>} BlockerSpec
 * @property {string} type the registered type
 */

/**
 * @typedef {() => void} Thunk A function that takes no arguments and returns nothing
 * @typedef {[BlockerSpec, Thunk]} BlockerReturn
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
 * @type {Map<string, [(spec: BlockerSpec, poll: Poller<any>) => () => any, (spec: BlockerSpec) => Thunk]>}
 */
const registry = new Map();

/**
 * Register blocker/unblocker makers.
 * @template T
 * @param {string} type the spec.type property
 * @param {(spec: BlockerSpec, poll: Poller<T>) => () => T} makeBlockerWithPoll the blocker maker
 * @param {(spec: BlockerSpec) => Thunk} [makeUnblocker=_spec => () => {}] the unblocker maker
 */
export function registerBlocker(
  type,
  makeBlockerWithPoll,
  makeUnblocker = _spec => () => {},
) {
  if (registry.has(type)) {
    throw TypeError(`Registry already has an entry for ${type}`);
  }
  registry.set(type, [makeBlockerWithPoll, makeUnblocker]);
}

/**
 * Construct a blocker from its specdata.
 * @template T
 * @param {BlockerSpec} spec the created specdata
 * @param {Poller<T>} poll the poll function
 * @returns {() => T} the blocker
 */
export function getBlockerWithPoll(spec, poll) {
  const { type } = spec;
  const entry = registry.get(type);
  if (!entry) {
    throw TypeError(`Cannot find registered type ${type}`);
  }
  const mkBlocker = entry[0];
  return mkBlocker(spec, poll);
}

/**
 * Construct an unblocker from its specdata.
 * @param {BlockerSpec} spec the created specdata
 * @returns {Thunk} the unblocker
 */
export function getUnblocker(spec) {
  const { type } = spec;
  const entry = registry.get(type);
  if (!entry) {
    throw TypeError(`Cannot find registered type ${type}`);
  }
  const mkUnblocker = entry[1];
  return mkUnblocker(spec);
}
