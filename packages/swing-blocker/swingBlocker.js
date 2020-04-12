// @ts-check

// TODO: Replace with Presence('RETRY_POLL');
const toString = () => '[RETRY_POLL]';
const retryProto = Object.freeze({
  toString: Object.freeze(toString),
  [Symbol.toStringTag]: 'RETRY_POLL',
});
export const RETRY_POLL = Object.freeze(Object.create(retryProto));

/**
 * How far apart can the blocker be from the unblocker?
 * @enum {number}
 */
const blockerScope = {
  Inline: 0, // Communicates via local registers
  Stack: 1, // Communicates via function call
  Thread: 2, // Communicates via thread-specific data
  Process: 3, // Communicates via heap
  Kernel: 4, // Communicates via operating system
};

/**
 * @typedef {keyof typeof blockerScope} BlockerScope
 */

/**
 * The mapping of scope names to constants.
 * @type {BlockerScope[]}
 */
export const blockerScopeName = [];
Object.entries(blockerScope).forEach(
  /**
   * @type {function ([BlockerScope, number]): void}
   */
  ([name, scope]) => {
    blockerScopeName[scope] = name;
  },
);

/**
 * @typedef {Object} BlockerSpec
 * @property {string} type the registered type
 * @property {BlockerScope} scope
 */

/**
 * @typedef {() => void} Thunk A function that takes no arguments and returns nothing
 */

/**
 * @template {BlockerSpec} BS The specific kind of Blocker specification
 * @typedef {[BS, Thunk]} BlockerReturn
 */

/**
 * @template T
 * @typedef {(...args: any[]) => (T|typeof RETRY_POLL)} Poller Return the results of the poll
 */

/**
 * @template T
 * @typedef {(...args: any[]) => T} Blocker Synchronously wait for a new result
 */

/**
 * Create a blocker that polls.
 *
 * @template T
 * @param {Poller<T>} poll Return the results of the synchronization
 * @returns {Blocker<T>} the polling blocker
 */
export function makeBlocker(poll) {
  return (...args) => {
    for (;;) {
      // Do the poll for the result.
      const result = poll(...args);
      if (result !== RETRY_POLL) {
        // We got something, so return.
        return result;
      }
    }
  };
}

/**
 * @type {Map<string, [blockerScope, (spec: BlockerSpec, poll: Poller<any>) => () => any, (spec: BlockerSpec) => Thunk]>}
 */
const registry = new Map();

/**
 * Register blocker/unblocker makers.
 * @template T
 * @param {BlockerSpec} spec the base blocker specification
 * @param {(spec: BlockerSpec, poll: Poller<T>) => Blocker<T>} makeBlockerWithPoll the blocker maker
 * @param {(spec: BlockerSpec) => Thunk} [makeUnblocker=_spec => () => {}] the unblocker maker
 */
export function registerBlocker(
  { type, scope },
  makeBlockerWithPoll,
  makeUnblocker = _spec => () => {},
) {
  if (registry.has(type)) {
    throw TypeError(`Registry already has an entry for ${type}`);
  }
  registry.set(type, [blockerScope[scope], makeBlockerWithPoll, makeUnblocker]);
}

/**
 * Construct a blocker from its specdata.
 * @template T
 * @param {BlockerSpec} spec the created specdata
 * @param {Poller<T>} poll the poll function
 * @param {BlockerScope} [minScope='Stack'] minimum scope over which the unblocker must communicate
 * @returns {Blocker<T>} the blocker
 */
export function getBlockerWithPoll(spec, poll, minScope = 'Stack') {
  const { type } = spec;
  const entry = registry.get(type);
  if (!entry) {
    throw TypeError(`Cannot find registered type ${type}`);
  }
  const [maxScope, mkBlocker] = entry;
  if (maxScope < blockerScope[minScope]) {
    throw RangeError(
      `You requested at least ${minScope} scope, but the ${type} blocker only has ${blockerScopeName[maxScope]}`,
    );
  }
  return mkBlocker(spec, poll);
}

/**
 * Construct an unblocker from its specdata.
 * @param {BlockerSpec} spec the created specdata
 * @param {BlockerScope} minScope the minimum communication distance we can use
 * @returns {Thunk} the unblocker
 */
export function getUnblocker(spec, minScope = 'Stack') {
  const { type } = spec;
  const entry = registry.get(type);
  if (!entry) {
    throw TypeError(`Cannot find registered type ${type}`);
  }
  // eslint-disable-next-line no-unused-vars
  const [maxScope, _mkBlocker, mkUnblocker] = entry;
  if (maxScope < blockerScope[minScope]) {
    throw RangeError(
      `You requested at least ${minScope} scope, but the ${type} blocker only has ${blockerScopeName[maxScope]}`,
    );
  }
  return mkUnblocker(spec);
}
