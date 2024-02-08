// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { makeTagged } from '@endo/pass-style';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareVowKits = zone => {
  /** WeakMap<object, any> */
  const vowV0ToEphemeral = new WeakMap();

  /**
   * Get the current incarnation's promise kit associated with a vowV0.
   *
   * @param {import('./types.js').VowPayload['vowV0']} vowV0
   * @returns {import('@endo/promise-kit').PromiseKit<any>}
   */
  const findCurrentKit = vowV0 => {
    let pk = vowV0ToEphemeral.get(vowV0);
    if (pk) {
      return pk;
    }

    pk = makePromiseKit();
    pk.promise.catch(() => {}); // silence unhandled rejection
    vowV0ToEphemeral.set(vowV0, pk);
    return pk;
  };

  /**
   * @param {'resolve' | 'reject'} kind
   * @param {import('./types.js').VowPayload['vowV0']} vowV0
   * @param {unknown} value
   */
  const settle = (kind, vowV0, value) => {
    const kit = findCurrentKit(vowV0);
    const cb = kit[kind];
    if (!cb) {
      return;
    }
    vowV0ToEphemeral.set(vowV0, harden({ promise: kit.promise }));
    cb(value);
  };

  const makeVowInternalsKit = zone.exoClassKit(
    'VowInternalsKit',
    {
      vowV0: M.interface('VowV0', {
        shorten: M.call().returns(M.promise()),
      }),
      settler: M.interface('Settler', {
        resolve: M.call().optional(M.any()).returns(),
        reject: M.call().optional(M.any()).returns(),
      }),
    },
    () => ({}),
    {
      vowV0: {
        /**
         * @returns {Promise<any>}
         */
        shorten() {
          return findCurrentKit(this.facets.vowV0).promise;
        },
      },
      settler: {
        /**
         * @param {any} [value]
         */
        resolve(value) {
          const { vowV0 } = this.facets;
          settle('resolve', vowV0, value);
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          const { vowV0 } = this.facets;
          settle('reject', vowV0, reason);
        },
      },
    },
  );

  /**
   * @template T
   * @returns {import('./types.js').VowKit<T>}
   */
  const makeVowKit = () => {
    const { settler, vowV0 } = makeVowInternalsKit();
    const vow = makeTagged('Vow', harden({ vowV0 }));
    return harden({ settler, vow });
  };

  /**
   * @template T
   * @returns {import('./types.js').VowPromiseKit<T>}
   */
  const makeVowPromiseKit = () => {
    const { settler, vowV0 } = makeVowInternalsKit();
    const vow = makeTagged('Vow', harden({ vowV0 }));

    /** @type {{ promise: Promise<T> }} */
    const { promise } = findCurrentKit(vowV0);
    return harden({ settler, vow, promise });
  };
  return { makeVowKit, makeVowPromiseKit };
};

harden(prepareVowKits);
