// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareWhenableKit = zone => {
  /**
   * @type {WeakMap<import('./when.js').Whenable['whenable0'], import('@endo/promise-kit').PromiseKit<any>>}
   */
  const whenableToPromiseKit = new WeakMap();

  /**
   * Get the current incarnation's promise kit associated with a whenable.
   *
   * @param {import('./when.js').Whenable['whenable0']} whenable
   * @returns {import('@endo/promise-kit').PromiseKit<any>}
   */
  const findCurrentKit = whenable => {
    let pk = whenableToPromiseKit.get(whenable);
    if (!pk) {
      pk = makePromiseKit();
      whenableToPromiseKit.set(whenable, pk);
    }
    return pk;
  };

  const rawMakeWhenableKit = zone.exoClassKit(
    'WhenableKit',
    {
      whenable: M.interface('Whenable', {
        shorten: M.call().returns(M.promise()),
      }),
      settler: M.interface('Settler', {
        resolve: M.call().optional(M.any()).returns(),
        reject: M.call().optional(M.any()).returns(),
      }),
    },
    () => ({}),
    {
      whenable: {
        /**
         * @returns {Promise<any>}
         */
        shorten() {
          return findCurrentKit(this.facets.whenable).promise;
        },
      },
      settler: {
        /**
         * @param {any} [value]
         */
        resolve(value) {
          findCurrentKit(this.facets.whenable).resolve(value);
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          findCurrentKit(this.facets.whenable).reject(reason);
        },
      },
    },
  );

  const makeWhenableKit = () => {
    const { settler, whenable: whenable0 } = rawMakeWhenableKit();
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
