// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { makeTagged } from '@endo/pass-style';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareWhenableKits = zone => {
  /** WeakMap<object, any> */
  const whenable0ToEphemeral = new WeakMap();

  /**
   * Get the current incarnation's promise kit associated with a whenable0.
   *
   * @param {import('./types.js').WhenablePayload['whenable0']} whenable0
   * @returns {import('@endo/promise-kit').PromiseKit<any>}
   */
  const findCurrentKit = whenable0 => {
    let pk = whenable0ToEphemeral.get(whenable0);
    if (pk) {
      return pk;
    }

    pk = makePromiseKit();
    pk.promise.catch(() => {}); // silence unhandled rejection
    whenable0ToEphemeral.set(whenable0, pk);
    return pk;
  };

  /**
   * @param {'resolve' | 'reject'} kind
   * @param {import('./types.js').WhenablePayload['whenable0']} whenable0
   * @param {unknown} value
   */
  const settle = (kind, whenable0, value) => {
    const kit = findCurrentKit(whenable0);
    const cb = kit[kind];
    if (!cb) {
      return;
    }
    whenable0ToEphemeral.set(whenable0, harden({ promise: kit.promise }));
    cb(value);
  };

  const rawMakeWhenableKit = zone.exoClassKit(
    'Whenable0Kit',
    {
      whenable0: M.interface('Whenable0', {
        shorten: M.call().returns(M.promise()),
      }),
      settler: M.interface('Settler', {
        resolve: M.call().optional(M.any()).returns(),
        reject: M.call().optional(M.any()).returns(),
      }),
    },
    () => ({}),
    {
      whenable0: {
        /**
         * @returns {Promise<any>}
         */
        shorten() {
          return findCurrentKit(this.facets.whenable0).promise;
        },
      },
      settler: {
        /**
         * @param {any} [value]
         */
        resolve(value) {
          const { whenable0 } = this.facets;
          settle('resolve', whenable0, value);
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          const { whenable0 } = this.facets;
          settle('reject', whenable0, reason);
        },
      },
    },
  );

  /**
   * @template T
   * @returns {import('./types.js').WhenableKit<T>}
   */
  const makeWhenableKit = () => {
    const { settler, whenable0 } = rawMakeWhenableKit();
    const whenable = makeTagged('Whenable', harden({ whenable0 }));
    return harden({ settler, whenable });
  };

  /**
   * @template T
   * @returns {import('./types.js').WhenablePromiseKit<T>}
   */
  const makeWhenablePromiseKit = () => {
    const { settler, whenable0 } = rawMakeWhenableKit();
    const whenable = makeTagged('Whenable', harden({ whenable0 }));

    /**
     * It would be nice to fully type this, but TypeScript gives:
     * TS1320: Type of 'await' operand must either be a valid promise or must not contain a callable 'then' member.
     * @type {unknown}
     */
    const whenablePromiseLike = {
      then(onFulfilled, onRejected) {
        // This promise behaviour is ephemeral.  If you want a persistent
        // subscription, you must use `when(p, watcher)`.
        const { promise } = findCurrentKit(whenable0);
        return promise.then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        const { promise } = findCurrentKit(whenable0);
        return promise.catch(onRejected);
      },
      finally(onFinally) {
        const { promise } = findCurrentKit(whenable0);
        return promise.finally(onFinally);
      },
    };
    const promise = /** @type {Promise<T>} */ (whenablePromiseLike);
    return harden({ settler, whenable, promise });
  };
  return { makeWhenableKit, makeWhenablePromiseKit };
};

harden(prepareWhenableKits);
