import { M } from '@endo/patterns';
import { fromUniqueEntries } from '@agoric/internal';
import { prepareExoClassKit } from './exo-utils.js';

const { Fail, quote: q } = assert;

/**
 * @typedef {object} Revoker
 * @property {() => boolean} revoke
 */

/**
 * @template {any} [U=any]
 * @typedef {object} RevocableKit
 * @property {Revoker} revoker
 * @property {U} revocable
 *   Forwards to the underlying exo object, until revoked
 */

/**
 * Make an exo class kit for wrapping an underlying exo class,
 * where the wrapper is a revocable forwarder
 *
 * @template {any} [U=any]
 * @param {import('./exo-utils').Baggage} baggage
 * @param {string} uKindName
 *   The `kindName` of the underlying exo class
 * @param {string} uInterfaceName
 *   The `interfaceName` of the underlying interface guard
 * @param {(string|symbol)[]} uMethodNames
 *   The method names of the underlying exo class
 * @param {Record<
 *   string|symbol,
 *   import('@endo/patterns').MethodGuard
 * >} [extraMethodGuards]
 * @param {Record<
 *   string|symbol,
 *   (...args) => any
 * >} [extraMethods]
 * @returns {(underlying: U) => RevocableKit<U>}
 */
export const prepareRevocableKit = (
  baggage,
  uKindName,
  uInterfaceName,
  uMethodNames,
  extraMethodGuards = undefined,
  extraMethods = undefined,
) => {
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

  const makeRevocableKit = prepareExoClassKit(
    baggage,
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
                const {
                  state: {
                    // @ts-expect-error normal exo-this typing confusion
                    underlying,
                  },
                } = this;
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
    },
  );

  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore parameter confusion
  return makeRevocableKit;
};
harden(prepareRevocableKit);
