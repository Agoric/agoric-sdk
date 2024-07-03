import { Fail, q } from '@endo/errors';
import { fromUniqueEntries } from '@endo/common/from-unique-entries.js';
import { M } from '@endo/patterns';

/** @import {Amplify} from '@endo/exo'; */

/**
 * @template [U=any]
 * @typedef {object} RevocableMakerKit
 * @property {(revocable: U) => boolean} revoke
 * @property {(underlying: U) => U} makeRevocable
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
 * @property {U} revocable
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
 *   string|symbol,
 *   import('@endo/patterns').MethodGuard
 * >} [extraMethodGuards]
 * For guarding the `extraMethods`, if you include them below. These appear
 * only on the synthesized interface guard for the revocable caretaker, and
 * do not necessarily correspond to any method of the underlying.
 * @property {Record<
 *   string|symbol,
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
 * @param {(string|symbol)[]} uMethodNames
 *   The method names of the underlying exo class that should be represented
 *   by transparently-forwarding methods of the revocable caretaker.
 * @param {RevocableKitOptions} [options]
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
    extraMethodGuards = undefined,
    extraMethods = undefined,
  } = options;
  const RevocableIKit = harden({
    revoker: M.interface(`${uInterfaceName}_revoker`, {
      revoke: M.call().returns(M.boolean()),
    }),
    revocable: M.interface(
      `${uInterfaceName}_revocable`,
      {
        ...extraMethodGuards,
      },
      {
        defaultGuards: 'raw',
      },
    ),
  });

  const revocableKindName = `${uKindName}_caretaker`;

  /** @type {Amplify<any>} */
  let amplifier;

  const makeRevocableKit = zone.exoClassKit(
    revocableKindName,
    RevocableIKit,
    underlying => ({
      underlying,
    }),
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
      revocable: {
        ...fromUniqueEntries(
          uMethodNames.map(name => [
            name,
            {
              // Use concise method syntax for exo methods
              [name](...args) {
                // @ts-expect-error normal exo-this typing confusion
                const { underlying } = this.state;
                underlying !== undefined ||
                  Fail`${q(revocableKindName)} revoked`;
                return underlying[name](...args);
              },
              // @ts-expect-error using possible symbol as index type
            }[name],
          ]),
        ),
        ...extraMethods,
      },
    },
    {
      stateShape: {
        underlying: M.opt(M.remotable('underlying')),
      },
      receiveAmplifier: amp => {
        amplifier = amp;
      },
    },
  );

  /**
   * @param {U} underlying
   * @returns {U}
   */
  const makeRevocable = underlying =>
    // @ts-expect-error some confusion about UU vs Guarded<U> I think
    makeRevocableKit(underlying).revocable;

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
