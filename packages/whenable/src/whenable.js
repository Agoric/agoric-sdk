// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {WeakMap<object, any>} [whenable0ToEphemeral]
 */
export const prepareWhenableKit = (
  zone,
  whenable0ToEphemeral = new WeakMap(),
) => {
  /**
   * Get the current incarnation's promise kit associated with a whenable0.
   *
   * @param {import('./when.js').Whenable['whenable0']} whenable0
   * @returns {import('@endo/promise-kit').PromiseKit<any>}
   */
  const findCurrentKit = whenable0 => {
    let pk = whenable0ToEphemeral.get(whenable0);
    if (!pk) {
      pk = makePromiseKit();
      whenable0ToEphemeral.set(whenable0, pk);
    }
    return pk;
  };

  /**
   * @param {(value: unknown) => void} cb
   * @param {import('./when.js').Whenable['whenable0']} whenable0
   * @param {Promise<any>} promise
   * @param {unknown} value
   */
  const settle = (cb, whenable0, promise, value) => {
    if (!cb) {
      return;
    }
    whenable0ToEphemeral.set(whenable0, harden({ promise }));
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
          const { resolve, promise } = findCurrentKit(whenable0);
          settle(resolve, whenable0, promise, value);
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          const { whenable0 } = this.facets;
          const { reject, promise } = findCurrentKit(whenable0);
          settle(reject, whenable0, promise, reason);
        },
      },
    },
  );

  const makeWhenableKit = () => {
    const { settler, whenable0 } = rawMakeWhenableKit();
    return harden({ settler, whenable: { whenable0 } });
  };
  return makeWhenableKit;
};

harden(prepareWhenableKit);

/**
 * @template [T=any]
 * @typedef {{ whenable: import('./when').Whenable<T>, settler: Settler<T> }} WhenableKit
 */

/**
 * @template [T=any]
 * @typedef {{ resolve(value?: T): void, reject(reason?: any): void }} Settler
 */
