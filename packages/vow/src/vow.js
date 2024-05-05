// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { makeTagged } from '@endo/pass-style';
import { PromiseWatcherI } from '@agoric/base-zone';

const sink = () => {};
harden(sink);

/**
 * @typedef {Partial<import('@endo/promise-kit').PromiseKit<any>> &
 *   Pick<import('@endo/promise-kit').PromiseKit<any>, 'promise'>} VowEphemera
 */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareVowKit = zone => {
  /** @type {WeakMap<import('./types.js').VowResolver, VowEphemera>} */
  const resolverToEphemera = new WeakMap();

  /**
   * Get the current incarnation's promise kit associated with a vowV0.
   *
   * @param {import('./types.js').VowResolver} resolver
   */
  const provideCurrentKit = resolver => {
    let pk = resolverToEphemera.get(resolver);
    if (pk) {
      return pk;
    }

    pk = makePromiseKit();
    pk.promise.catch(sink); // silence unhandled rejection
    resolverToEphemera.set(resolver, pk);
    return pk;
  };

  /**
   * @param {import('./types.js').VowResolver} resolver
   */
  const getPromiseKitForResolution = resolver => {
    const kit = provideCurrentKit(resolver);
    if (kit.resolve) {
      // Resolution is a one-time event, so forget the resolve/reject functions.
      resolverToEphemera.set(resolver, harden({ promise: kit.promise }));
    }
    return kit;
  };

  const makeVowInternalsKit = zone.exoClassKit(
    'VowInternalsKit',
    {
      vowV0: M.interface('VowV0', {
        shorten: M.call().returns(M.promise()),
      }),
      resolver: M.interface('VowResolver', {
        resolve: M.call().optional(M.any()).returns(),
        reject: M.call().optional(M.any()).returns(),
      }),
      watchNextStep: PromiseWatcherI,
    },
    () => ({
      value: undefined,
      // The stepStatus is null if the promise step hasn't settled yet.
      stepStatus: /** @type {null | 'fulfilled' | 'rejected'} */ (null),
    }),
    {
      vowV0: {
        /**
         * @returns {Promise<any>}
         */
        async shorten() {
          const { stepStatus, value } = this.state;
          switch (stepStatus) {
            case 'fulfilled':
              return value;
            case 'rejected':
              throw value;
            case null:
              return provideCurrentKit(this.facets.resolver).promise;
            default:
              throw new TypeError(`unexpected stepStatus ${stepStatus}`);
          }
        },
      },
      resolver: {
        /**
         * @param {any} [value]
         */
        resolve(value) {
          const { resolver } = this.facets;
          const { promise, resolve } = getPromiseKitForResolution(resolver);
          if (resolve) {
            resolve(value);
            zone.watchPromise(promise, this.facets.watchNextStep);
          }
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          const { resolver, watchNextStep } = this.facets;
          const { reject } = getPromiseKitForResolution(resolver);
          if (reject) {
            reject(reason);
            watchNextStep.onRejected(reason);
          }
        },
      },
      watchNextStep: {
        onFulfilled(value) {
          this.state.stepStatus = 'fulfilled';
          this.state.value = value;
        },
        onRejected(reason) {
          this.state.stepStatus = 'rejected';
          this.state.value = reason;
        },
      },
    },
  );

  /**
   * @template T
   * @returns {import('./types.js').VowKit<T>}
   */
  const makeVowKit = () => {
    const { resolver, vowV0 } = makeVowInternalsKit();
    const vow = makeTagged('Vow', harden({ vowV0 }));
    return harden({ resolver, vow });
  };

  return makeVowKit;
};

harden(prepareVowKit);
