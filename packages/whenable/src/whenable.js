// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { makeTagged } from '@endo/pass-style';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareWhenableKits = zone => {
  /** WeakMap<object, any> */
  const whenableV0ToEphemeral = new WeakMap();

  /**
   * Get the current incarnation's promise kit associated with a whenableV0.
   *
   * @param {import('./types.js').WhenablePayload['whenableV0']} whenableV0
   * @returns {import('@endo/promise-kit').PromiseKit<any>}
   */
  const findCurrentKit = whenableV0 => {
    let pk = whenableV0ToEphemeral.get(whenableV0);
    if (pk) {
      return pk;
    }

    pk = makePromiseKit();
    pk.promise.catch(() => {}); // silence unhandled rejection
    whenableV0ToEphemeral.set(whenableV0, pk);
    return pk;
  };

  /**
   * @param {'resolve' | 'reject'} kind
   * @param {import('./types.js').WhenablePayload['whenableV0']} whenableV0
   * @param {unknown} value
   */
  const settle = (kind, whenableV0, value) => {
    const kit = findCurrentKit(whenableV0);
    const cb = kit[kind];
    if (!cb) {
      return;
    }
    whenableV0ToEphemeral.set(whenableV0, harden({ promise: kit.promise }));
    cb(value);
  };

  const makeWhenableInternalsKit = zone.exoClassKit(
    'WhenableInternalsKit',
    {
      whenableV0: M.interface('WhenableV0', {
        shorten: M.call().returns(M.promise()),
      }),
      settler: M.interface('Settler', {
        resolve: M.call().optional(M.any()).returns(),
        reject: M.call().optional(M.any()).returns(),
      }),
    },
    () => ({}),
    {
      whenableV0: {
        /**
         * @returns {Promise<any>}
         */
        shorten() {
          return findCurrentKit(this.facets.whenableV0).promise;
        },
      },
      settler: {
        /**
         * @param {any} [value]
         */
        resolve(value) {
          const { whenableV0 } = this.facets;
          settle('resolve', whenableV0, value);
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          const { whenableV0 } = this.facets;
          settle('reject', whenableV0, reason);
        },
      },
    },
  );

  /**
   * @template T
   * @returns {import('./types.js').WhenableKit<T>}
   */
  const makeWhenableKit = () => {
    const { settler, whenableV0 } = makeWhenableInternalsKit();
    const whenable = makeTagged('Whenable', harden({ whenableV0 }));
    return harden({ settler, whenable });
  };

  /**
   * @template T
   * @returns {import('./types.js').WhenablePromiseKit<T>}
   */
  const makeWhenablePromiseKit = () => {
    const { settler, whenableV0 } = makeWhenableInternalsKit();
    const whenable = makeTagged('Whenable', harden({ whenableV0 }));

    /**
     * It would be nice to fully type this, but TypeScript gives:
     * TS1320: Type of 'await' operand must either be a valid promise or must not contain a callable 'then' member.
     * @type {unknown}
     */
    const whenablePromiseLike = {
      then(onFulfilled, onRejected) {
        // This promise behaviour is ephemeral.  If you want a persistent
        // subscription, you must use `when(p, watcher)`.
        const { promise } = findCurrentKit(whenableV0);
        return promise.then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        const { promise } = findCurrentKit(whenableV0);
        return promise.catch(onRejected);
      },
      finally(onFinally) {
        const { promise } = findCurrentKit(whenableV0);
        return promise.finally(onFinally);
      },
    };
    const promise = /** @type {Promise<T>} */ (whenablePromiseLike);
    return harden({ settler, whenable, promise });
  };
  return { makeWhenableKit, makeWhenablePromiseKit };
};

harden(prepareWhenableKits);
