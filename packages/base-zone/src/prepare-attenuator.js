import { Fail, q } from '@endo/errors';
import { fromUniqueEntries } from '@endo/common/from-unique-entries.js';
import { M } from '@endo/patterns';
import { makeHeapZone } from './heap.js';

// This attenuator implementation is just a simplification of the
// revocable kit implementation in prepare-revocable.js. The revocable kit
// provides both attenuation and revocation, since we can have both for the
// price of just one level of indirection. But if you don't need revocation,
// the revocable kit has more API complexity than you need.
//
// We could have built `prepareAttenuatorMaker` as a trivial wrapper around
// `prepareRevocableMakerKit`. But then we'd have the weird artifact that the
// `extraMethods` would see a `{ state, facets: { revocable, revoker }}` context
// rather than a `{ state, self }` context. So instead, we copied and edited it
// down. Please co-maintain these two modules.

// Because the attenuator just uses an exo class rather than a class kit,
// it cannot support the privilege separation of a distinct revoker facet.
// But it can still support `selfRevoke` as a separate `extraMethod`, as shown
// in a testcase at `prepare-attenuator.test.js`

/**
 * @param {string} wrapperKindName
 * @param {PropertyKey[]} uMethodNames
 * @param {Record<PropertyKey, (...args: any[]) => any>} [extraMethods]
 */
export const wrapperMethods = (
  wrapperKindName,
  uMethodNames,
  extraMethods = {},
) =>
  harden({
    ...fromUniqueEntries(
      uMethodNames.map(name => [
        name,
        {
          // Use concise method syntax for exo methods
          [name](...args) {
            // @ts-expect-error normal exo-this typing confusion
            const { underlying } = this.state;

            // Because attenuators still support someone adding `selfRevoke`
            // as an `extraMethod`, this test is still useful. See the
            // testcase in `prepare-attenuator.test.js`.
            underlying !== undefined || Fail`${q(wrapperKindName)} revoked`;

            return underlying[name](...args);
          },
          // @ts-expect-error using possible symbol as index type
        }[name],
      ]),
    ),
    ...extraMethods,
  });
harden(wrapperMethods);

/**
 * @template [U=any]
 * @callback MakeAttenuator
 * @param {U} underlying
 * @returns {Partial<U>}
 */

/**
 * @template [U=any]
 * @typedef {object} AttenuatorThis
 * @property {Partial<U>} self
 * @property {{ underlying: U }} state
 */

/**
 * @template [U=any]
 * @typedef {object} AttenuatorOptions
 * @property {string} [uInterfaceName]
 *   The `interfaceName` of the underlying interface guard.
 *   Defaults to the `uKindName`.
 * @property {Record<
 *   PropertyKey,
 *   import('@endo/patterns').MethodGuard
 * >} [extraMethodGuards]
 * For guarding the `extraMethods`, if you include them below. These appear
 * only on the synthesized interface guard for the attenuator, and
 * do not necessarily correspond to any method of the underlying.
 * @property {Record<
 *   PropertyKey,
 *   (this: AttenuatorThis<U>, ...args: any[]) => any
 * >} [extraMethods]
 * Extra methods adding behavior only to the attenuator, and
 * do not necessarily correspond to any methods of the underlying.
 */

/**
 * Make an exo class for wrapping an underlying exo class,
 * where the wrapper is an attenuator of the underlying.
 *
 * @template [U=any]
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {string} uKindName
 *   The `kindName` of the underlying exo class
 * @param {(keyof U)[]} uMethodNames
 *   The method names of the underlying exo class that should be represented
 *   by transparently-forwarding methods of the attenuator.
 * @param {AttenuatorOptions<U>} [options]
 * @returns {MakeAttenuator}
 */
export const prepareAttenuatorMaker = (
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
  const AttenuatorI = M.interface(
    `${uInterfaceName}_attenuator`,
    extraMethodGuards,
    { defaultGuards: 'raw' },
  );

  const attenuatorKindName = `${uKindName}_attenuator`;

  return zone.exoClass(
    attenuatorKindName,
    AttenuatorI,
    underlying => ({ underlying }),
    wrapperMethods(attenuatorKindName, uMethodNames, extraMethods),
    {
      stateShape: { underlying: M.opt(M.remotable('underlying')) },
    },
  );
};
harden(prepareAttenuatorMaker);

const PrefixedKindNameRE = /(alleged: |DebugName: )(.*)/;

/**
 * A convenience above `prepareAttenuatorMaker` for doing a singleton
 * ephemeral attenuator, i.e., a new attenuator instance (and hidden class)
 * that is allocated in the heap zone, and therefore ephemeral. The underlying
 * can be durable or not, with no conflict with the attenuator being
 * ephemeral. The price of this convenience is the allocation of the hidden
 * class and wrapper methods per `attenuateOne` call, i.e., per attenuator
 * instance.
 *
 * @template {any} U
 * @param {U} underlying
 * @param {(keyof U)[]} uMethodNames
 * @param {AttenuatorOptions<U>} [options]
 * @returns {Partial<U>}
 */
export const attenuateOne = (underlying, uMethodNames, options = undefined) => {
  const heapZone = makeHeapZone();
  let uKindName = underlying[Symbol.toStringTag] || 'Underlying';
  const match = PrefixedKindNameRE.exec(uKindName);
  if (match) {
    uKindName = match[2];
  }
  const makeAttenuator = prepareAttenuatorMaker(
    heapZone,
    uKindName,
    uMethodNames,
    options,
  );
  return makeAttenuator(underlying);
};
harden(attenuateOne);
