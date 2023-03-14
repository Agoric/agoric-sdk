import { makePromiseKit } from '@endo/promise-kit';

/**
 * Make { produce, consume } where for each name, `consume[name]` is a promise
 * and `produce[name].resolve` resolves it.
 *
 * Note: repeated resolves() are noops.
 *
 * @param {typeof console.log} [log]
 * @returns {PromiseSpace}
 */

export const makePromiseSpace = (log = (..._args) => {}) => {
  /**
   * @typedef {PromiseRecord<unknown> & {
   *   reset: (reason?: unknown) => void,
   *   isSettling: boolean,
   * }} PromiseState
   */
  /** @type {Map<string, PromiseState>} */
  const nameToState = new Map();
  const remaining = new Set();

  const findOrCreateState = name => {
    /** @type {PromiseState} */
    let state;
    const currentState = nameToState.get(name);
    if (currentState) {
      state = currentState;
    } else {
      log(`${name}: new Promise`);
      const pk = makePromiseKit();

      pk.promise
        .finally(() => {
          remaining.delete(name);
          log(name, 'settled; remaining:', [...remaining.keys()].sort());
        })
        .catch(() => {});

      const settling = () => {
        assert(state);
        state = harden({ ...state, isSettling: true });
        nameToState.set(name, state);
      };

      const resolve = value => {
        settling();
        pk.resolve(value);
      };
      const reject = reason => {
        settling();
        pk.reject(reason);
      };

      const reset = (reason = undefined) => {
        if (!state.isSettling) {
          if (!reason) {
            // Reuse the old promise; don't reject it.
            return;
          }
          reject(reason);
        }
        // Now publish a new promise.
        nameToState.delete(name);
        remaining.delete(name);
      };

      state = harden({
        isSettling: false,
        resolve,
        reject,
        reset,
        promise: pk.promise,
      });
      nameToState.set(name, state);
      remaining.add(name);
    }
    return state;
  };

  const consume = new Proxy(
    {},
    {
      get: (_target, name) => {
        assert.typeof(name, 'string');
        const kit = findOrCreateState(name);
        return kit.promise;
      },
    },
  );

  const produce = new Proxy(
    {},
    {
      get: (_target, name) => {
        assert.typeof(name, 'string');
        const { reject, resolve, reset } = findOrCreateState(name);
        return harden({ reject, resolve, reset });
      },
    },
  );

  return harden({ produce, consume });
};
harden(makePromiseSpace);
