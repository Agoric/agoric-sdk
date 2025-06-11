import { M } from '@endo/patterns';
import { wrapperMethods } from './prepare-attenuator.js';

/** @import {Amplify} from '@endo/exo'; */

// This revocable kit implementation provides for both attenuation and
// revocation, since both can be provided at the cost of one level of
// indirection. But if you just need attenuation without revocation, better to
// use the attenuator implementation in prepare-attenuator.js.
// Please co-maintain these two modules.

/**
 * @template [U=any]
 * @callback MakeRevocable
 * @param {U} underlying
 * @returns {Partial<U>}
 */

/**
 * @template [U=any]
 * @typedef {object} RevocableMakerKit
 * @property {(revocable: U) => boolean} revoke
 * @property {MakeRevocable} makeRevocable
 *   Forwards to the underlying exo object, until revoked
 */

/**
 * @typedef {object} RevokerFacet
 * @property {() => boolean} revoke
 */

/**
 * @template [U=any]
 * @typedef {object} RevocableKit
 * @property {RevokerFacet} revoker
 * @property {Partial<U>} revocable
 *   Forwards to the underlying exo object, until revoked
 */

/**
 * @template [U=any]
 * @typedef {object} RevocableKitThis
 * @property {RevocableKit<U>} facets
 * @property {{ underlying: U }} state
 */

/**
 * @template [U=any]
 * @typedef {object} RevocableKitOptions
 * @property {string} [uInterfaceName]
 *   The `interfaceName` of the underlying interface guard.
 *   Defaults to the `uKindName`.
 * @property {Record<
 *   PropertyKey,
 *   import('@endo/patterns').MethodGuard
 * >} [extraMethodGuards]
 * For guarding the `extraMethods`, if you include them below. These appear
 * only on the synthesized interface guard for the revocable caretaker, and
 * do not necessarily correspond to any method of the underlying.
 * @property {Record<
 *   PropertyKey,
 *   (this: RevocableKitThis<U>, ...args: any[]) => any
 * >} [extraMethods]
 * Extra methods adding behavior only to the revocable caretaker, and
 * do not necessarily correspond to any methods of the underlying.
 */

/**
 * Make an internal exo class kit for wrapping an underlying exo class,
 * where the wrapper is a revocable forwarder.
 *
 * @template [U=any]
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {string} uKindName
 *   The `kindName` of the underlying exo class
 * @param {PropertyKey[]} uMethodNames
 *   The method names of the underlying exo class that should be represented
 *   by transparently-forwarding methods of the revocable caretaker.
 * @param {(amp: Amplify<any>) => void} [receiveAmplifier]
 * @param {RevocableKitOptions<U>} [options]
 */
export const prepareInternalRevocableMakerKit = (
  zone,
  uKindName,
  uMethodNames,
  receiveAmplifier,
  options = {},
) => {
  const {
    uInterfaceName = uKindName,
    extraMethodGuards = {},
    extraMethods = {},
  } = options;
  const RevocableIKit = harden({
    revoker: M.interface(`${uInterfaceName}_revoker`, {
      revoke: M.call().returns(M.boolean()),
    }),
    revocable: M.interface(`${uInterfaceName}_revocable`, extraMethodGuards, {
      defaultGuards: 'raw',
    }),
  });

  const revocableKindName = `${uKindName}_caretaker`;

  const makeInternalRevocableKit = zone.exoClassKit(
    revocableKindName,
    RevocableIKit,
    underlying => ({ underlying }),
    {
      revoker: {
        revoke() {
          const { state } = this;
          if (state.underlying === undefined) {
            return false;
          }
          state.underlying = undefined;
          return true;
        },
      },
      revocable: wrapperMethods(revocableKindName, uMethodNames, extraMethods),
    },
    {
      stateShape: { underlying: M.opt(M.remotable('underlying')) },
      receiveAmplifier,
    },
  );
  return makeInternalRevocableKit;
};

/**
 * Make an exo class kit for wrapping an underlying exo class,
 * where the wrapper is a revocable forwarder.
 *
 * @template [U=any]
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {string} uKindName
 *   The `kindName` of the underlying exo class
 * @param {PropertyKey[]} uMethodNames
 *   The method names of the underlying exo class that should be represented
 *   by transparently-forwarding methods of the revocable caretaker.
 * @param {RevocableKitOptions<U>} [options]
 * @returns {RevocableMakerKit<U>}
 */
export const prepareRevocableMakerKit = (
  zone,
  uKindName,
  uMethodNames,
  options = {},
) => {
  /** @type {Amplify<any>} */
  let amplifier;

  const makeInternalRevocableKit = prepareInternalRevocableMakerKit(
    zone,
    uKindName,
    uMethodNames,
    amp => {
      amplifier = amp;
    },
    options,
  );

  /**
   * @type {MakeRevocable}
   */
  const makeRevocable = underlying =>
    makeInternalRevocableKit(underlying).revocable;

  /**
   * @param {U} revocable
   * @returns {boolean}
   */
  const revoke = revocable => {
    /** @type {RevocableKit<U>} */
    const facets = amplifier(revocable);
    if (facets === undefined) {
      return false;
    }
    return facets.revoker.revoke();
  };

  return harden({
    revoke,
    makeRevocable,
  });
};
harden(prepareRevocableMakerKit);

/**
 * Create an exo class kit used to guard operations and cancel them.
 *
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {(canceller: {
 *   cancel: () => boolean;
 *   revoke: () => boolean; // Alias for cancel (for revocable objects).
 *   release: () => void;
 * }) => void} [onRelease]
 *   Clean up any additional resources for the guarded object.
 */
export const prepareCancelKit = (zone, onRelease = () => {}) => {
  const makeCancelKit = zone.exoClassKit(
    'CancelKit',
    {
      canceller: M.interface('Canceller', {
        revoke: M.call().returns(M.boolean()),
        cancel: M.call().returns(M.boolean()),
        release: M.call().returns(),
      }),
      guard: M.interface('CancellationGuard', {
        assert: M.call().returns(),
        isCancelled: M.call().returns(M.boolean()),
        reason: M.call().returns(M.or(M.error(), M.undefined())),
      }),
    },
    /**
     * @type {(label: string) => { cancelled: boolean; label: string }}
     */
    label => ({ cancelled: false, label }),
    {
      canceller: {
        cancel() {
          const { cancelled } = this.state;
          if (cancelled) {
            return false;
          }
          this.state.cancelled = true;
          this.facets.canceller.release();
          return true;
        },
        revoke() {
          // Alias for cancel, for revocable objects.
          return this.facets.canceller.cancel();
        },
        release() {
          onRelease(this.facets.canceller);
        },
      },
      guard: {
        assert() {
          const {
            facets: { guard },
          } = this;
          if (guard.isCancelled()) {
            throw guard.reason();
          }
        },
        isCancelled() {
          const { cancelled } = this.state;
          return cancelled;
        },
        reason() {
          const {
            facets: { guard },
          } = this;
          const { label } = this.state;
          if (!guard.isCancelled()) {
            return undefined;
          }
          return assert.error(`${label} has been cancelled`);
        },
      },
    },
  );

  return makeCancelKit;
};
harden(prepareCancelKit);
