// @ts-check
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { makeTagged } from '@endo/pass-style';
import { PromiseWatcherI } from '@agoric/base-zone';

const { details: X } = assert;

const noop = () => {};
harden(noop);

/**
 * @import {PromiseKit} from '@endo/promise-kit';
 * @import {Zone} from '@agoric/base-zone';
 * @import {VowResolver, VowKit} from './types.js';
 * @import {VowRejectionTracker} from './rejection-tracker.js';
 */

/**
 * @typedef {Partial<PromiseKit<any>> &
 *   Pick<PromiseKit<any>, 'promise'> &
 *   { potentiallyHandled?: boolean }} VowEphemera
 */

/**
 * @param {Zone} zone
 * @param {VowRejectionTracker} [vowRejectionTracker]
 */
export const prepareVowKit = (zone, vowRejectionTracker) => {
  /** @type {WeakMap<VowResolver, VowEphemera>} */
  const resolverToEphemera = new WeakMap();

  /** @type {WeakMap<VowResolver, any>} */
  const resolverToNonStoredValue = new WeakMap();

  /**
   * Get the ephemera associated with a vowKit.resolver.
   *
   * @param {VowResolver} resolver
   * @param {{ potentiallyHandled?: boolean }} [options]
   */
  const provideEphemera = (resolver, options) => {
    let ephemera = resolverToEphemera.get(resolver);
    if (!ephemera) {
      ephemera = makePromiseKit();
      // Silence this internal promise's rejections, since we use the
      // rejectionTracker instead.
      ephemera.promise.catch(noop);
    }

    ephemera = harden({ ...ephemera, ...options });
    resolverToEphemera.set(resolver, ephemera);
    return ephemera;
  };

  /**
   * @param {VowResolver} resolver
   */
  const provideEphemeraForResolution = resolver => {
    const ephemera = provideEphemera(resolver);
    if (ephemera.resolve) {
      // Resolution is a one-time event, so forget the resolve/reject functions.
      const { resolve: _1, reject: _2, ...rest } = ephemera;
      resolverToEphemera.set(resolver, harden(rest));
    }
    return ephemera;
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
      /** @type {any} */
      value: undefined,
      /**
       * The stepStatus is null if the promise step hasn't settled yet.
       * @type {null | 'pending' | 'fulfilled' | 'rejected'}
       */
      stepStatus: null,
      isStoredValue: false,
      /**
       * Some versions of the VowInternalsKit will not have this property,
       * (and it cannot be added dynamically).
       * @type {boolean | undefined}
       */
      vowIsHandled: false,
      /**
       * Record for future properties that aren't in the schema.
       * UNTIL https://github.com/Agoric/agoric-sdk/issues/7407
       * @type {Record<string, any> | undefined}
       */
      extra: undefined,
    }),
    {
      vowV0: {
        /**
         * @returns {Promise<any>}
         */
        async shorten() {
          const { stepStatus, isStoredValue, value, vowIsHandled } = this.state;
          const { resolver, vowV0 } = this.facets;

          switch (stepStatus) {
            case 'fulfilled': {
              if (vowIsHandled === false) {
                this.state.vowIsHandled = true;
              }
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
              if (vowIsHandled === false) {
                this.state.vowIsHandled = true;
                vowRejectionTracker?.handle(vowV0);
              }
              const reason = resolverToNonStoredValue.has(resolver)
                ? resolverToNonStoredValue.get(resolver)
                : value;

              throw reason;
            }
            case null:
            case 'pending':
              return provideEphemera(this.facets.resolver, {
                potentiallyHandled: true,
              }).promise;
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
          const { stepStatus } = this.state;
          if (stepStatus !== null) {
            return;
          }
          this.state.stepStatus = 'pending';

          const { resolver } = this.facets;
          const { resolve } = provideEphemeraForResolution(resolver);
          resolve && resolve(value);

          zone.watchPromise(
            HandledPromise.resolve(value),
            this.facets.watchNextStep,
          );
        },
        /**
         * @param {any} [reason]
         */
        reject(reason) {
          const { stepStatus } = this.state;
          if (stepStatus !== null) {
            return;
          }
          this.state.stepStatus = 'rejected';

          const { resolver, watchNextStep } = this.facets;
          const { reject } = provideEphemeraForResolution(resolver);
          reject && reject(reason);
          watchNextStep.onRejected(reason);
        },
      },
      watchNextStep: {
        onFulfilled(value) {
          this.state.stepStatus = 'fulfilled';

          const { resolver } = this.facets;
          const { resolve } = provideEphemeraForResolution(resolver);
          harden(value);
          resolve && resolve(value);

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
          this.state.stepStatus = 'rejected';

          const { resolver, vowV0 } = this.facets;
          const { reject, potentiallyHandled } =
            provideEphemeraForResolution(resolver);
          harden(reason);
          reject && reject(reason);

          if (this.state.vowIsHandled === false) {
            if (potentiallyHandled) {
              this.state.vowIsHandled = true;
            } else {
              vowRejectionTracker?.reject(vowV0, reason);
            }
          }
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
