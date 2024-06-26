// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { makeTagged } from '@endo/pass-style';
import { PromiseWatcherI } from '@agoric/base-zone';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 * @import {VowResolver, VowKit} from './types.js'
 */

const sink = () => {};
harden(sink);

/**
 * @typedef {Partial<PromiseKit<any>> &
 *   Pick<PromiseKit<any>, 'promise'>} VowEphemera
 */

/**
 * @param {Zone} zone
 */
export const prepareVowKit = zone => {
  /** @type {WeakMap<VowResolver, VowEphemera>} */
  const resolverToEphemera = new WeakMap();

  /**
   * Get the current incarnation's promise kit associated with a vowV0.
   *
   * @param {VowResolver} resolver
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
   * @param {VowResolver} resolver
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
      stepStatus: /** @type {null | 'pending' | 'fulfilled' | 'rejected'} */ (
        null
      ),
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
            case 'pending':
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
          const { stepStatus } = this.state;
          const { resolve } = getPromiseKitForResolution(resolver);
          if (resolve) {
            resolve(value);
          }
          if (stepStatus === null) {
            this.state.stepStatus = 'pending';
            zone.watchPromise(
              HandledPromise.resolve(value),
              this.facets.watchNextStep,
            );
          }
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          const { resolver, watchNextStep } = this.facets;
          const { stepStatus } = this.state;
          const { reject } = getPromiseKitForResolution(resolver);
          if (reject) {
            reject(reason);
          }
          if (stepStatus === null) {
            watchNextStep.onRejected(reason);
          }
        },
      },
      watchNextStep: {
        onFulfilled(value) {
          const { resolver } = this.facets;
          const { resolve } = getPromiseKitForResolution(resolver);
          if (resolve) {
            resolve(value);
          }
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
   * @returns {VowKit<T>}
   */
  const makeVowKit = () => {
    const { resolver, vowV0 } = makeVowInternalsKit();
    const vow = makeTagged('Vow', harden({ vowV0 }));
    return harden({ resolver, vow });
  };

  return makeVowKit;
};

harden(prepareVowKit);
