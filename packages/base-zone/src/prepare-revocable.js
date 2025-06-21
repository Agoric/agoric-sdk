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
 * @callback MakeRevocableKit
 * @param {U} underlying
 * @returns {RevocableKit<U>}
 */

/**
 * @template [U=any]
 * @typedef {object} RevocableMakerKit
 * @property {(revocable: U) => boolean} revoke
 * @property {MakeRevocable<U>} makeRevocable
 *   Forwards to the underlying exo object, until revoked
 * @property {MakeRevocableKit<U>} makeRevocableKit
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

  /** @type {Amplify<any>} */
  let amplifier;

  const makeRevocableKit = zone.exoClassKit(
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
      receiveAmplifier: amp => {
        amplifier = amp;
      },
    },
  );

  /**
   * @type {MakeRevocable}
   */
  const makeRevocable = underlying => makeRevocableKit(underlying).revocable;

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
    /** @type {MakeRevocableKit} */
    makeRevocableKit,
  });
};
harden(prepareRevocableMakerKit);
