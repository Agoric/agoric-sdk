// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { makeTagged } from '@endo/pass-style';
import { PromiseWatcherI } from '@agoric/base-zone';

const { details: X } = assert;

/**
 * @import {PromiseKit} from '@endo/promise-kit';
 * @import {Zone} from '@agoric/base-zone';
 * @import {MapStore} from '@agoric/store';
 * @import {VowResolver, VowKit} from './types.js';
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

  /** @type {WeakMap<VowResolver, any>} */
  const resolverToNonStoredValue = new WeakMap();

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
        resolve: M.call().optional(M.raw()).returns(),
        reject: M.call().optional(M.raw()).returns(),
      }),
      watchNextStep: PromiseWatcherI,
    },
    () => ({
      value: /** @type {any} */ (undefined),
      // The stepStatus is null if the promise step hasn't settled yet.
      stepStatus: /** @type {null | 'pending' | 'fulfilled' | 'rejected'} */ (
        null
      ),
      isStoredValue: /** @type {boolean} */ (false),
      /**
       * Map for future properties that aren't in the schema.
       * UNTIL https://github.com/Agoric/agoric-sdk/issues/7407
       * @type {MapStore<any, any> | undefined}
       */
      extra: undefined,
    }),
    {
      vowV0: {
        /**
         * @returns {Promise<any>}
         */
        async shorten() {
          const { stepStatus, isStoredValue, value } = this.state;
          const { resolver } = this.facets;

          switch (stepStatus) {
            case 'fulfilled': {
              if (isStoredValue) {
                // Always return a stored fulfilled value.
                return value;
              } else if (resolverToNonStoredValue.has(resolver)) {
                // Non-stored value is available.
                return resolverToNonStoredValue.get(resolver);
              }
              // We can't recover the non-stored value, so throw the
              // explanation.
              throw value;
            }
            case 'rejected': {
              if (!isStoredValue && resolverToNonStoredValue.has(resolver)) {
                // Non-stored reason is available.
                throw resolverToNonStoredValue.get(resolver);
              }
              // Always throw a stored rejection reason.
              throw value;
            }
            case null:
            case 'pending':
              return provideCurrentKit(this.facets.resolver).promise;
            default:
              throw TypeError(`unexpected stepStatus ${stepStatus}`);
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
          harden(value);
          if (resolve) {
            resolve(value);
          }
          this.state.stepStatus = 'fulfilled';
          this.state.isStoredValue = zone.isStorable(value);
          if (this.state.isStoredValue) {
            this.state.value = value;
          } else {
            resolverToNonStoredValue.set(resolver, value);
            this.state.value = assert.error(
              X`Vow fulfillment value was not stored: ${value}`,
            );
          }
        },
        onRejected(reason) {
          const { resolver } = this.facets;
          const { reject } = getPromiseKitForResolution(resolver);
          harden(reason);
          if (reject) {
            reject(reason);
          }
          this.state.stepStatus = 'rejected';
          this.state.isStoredValue = zone.isStorable(reason);
          if (this.state.isStoredValue) {
            this.state.value = reason;
          } else {
            resolverToNonStoredValue.set(resolver, reason);
            this.state.value = assert.error(
              X`Vow rejection reason was not stored: ${reason}`,
            );
          }
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
/** @typedef {ReturnType<typeof prepareVowKit>} MakeVowKit */

harden(prepareVowKit);
