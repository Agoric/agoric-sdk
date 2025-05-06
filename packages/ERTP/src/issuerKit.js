// @jessie-check

import { assert, Fail } from '@endo/errors';
import { assertPattern } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { AssetKind, assertAssetKind } from './amountMath.js';
import { coerceDisplayInfo } from './displayInfo.js';
import { preparePaymentLedger } from './paymentLedger.js';

/**
 * @import {AdditionalDisplayInfo, RecoverySetsOption, IssuerKit, PaymentLedger} from './types.js';
 * @import {ShutdownWithFailure} from '@agoric/swingset-vat';
 * @import {TypedPattern} from '@agoric/internal';
 */

/**
 * @template {AssetKind} K
 * @typedef {object} IssuerRecord
 * @property {string} name
 * @property {K} assetKind
 * @property {AdditionalDisplayInfo} displayInfo
 * @property {Pattern} elementShape
 */

/**
 * Used _only_ internally, to make a new issuerKit or to revive an old one.
 *
 * @template {AssetKind} K
 * @param {IssuerRecord<K>} issuerRecord
 * @param {import('@agoric/zone').Zone} issuerZone
 * @param {RecoverySetsOption} recoverySetsState Omitted from issuerRecord
 *   because it was added in an upgrade.
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails in
 *   the middle of an atomic action (which btw should never happen), it
 *   potentially leaves its ledger in a corrupted state. If this function was
 *   provided, then the failed atomic action will call it, so that some larger
 *   unit of computation, like the enclosing vat, can be shutdown before
 *   anything else is corrupted by that corrupted state. See
 *   https://github.com/Agoric/agoric-sdk/issues/3434
 * @returns {IssuerKit<K>}
 */
const setupIssuerKit = (
  { name, assetKind, displayInfo, elementShape },
  issuerZone,
  recoverySetsState,
  optShutdownWithFailure = undefined,
) => {
  assert.typeof(name, 'string');
  assertAssetKind(assetKind);

  // Add assetKind to displayInfo, or override if present
  const cleanDisplayInfo = coerceDisplayInfo(displayInfo, assetKind);
  if (optShutdownWithFailure !== undefined) {
    assert.typeof(optShutdownWithFailure, 'function');
  }

  if (elementShape !== undefined) {
    assertPattern(elementShape);
  }

  // Attenuate the powerful authority to mint and change balances
  /** @type {PaymentLedger<K>} */
  // @ts-expect-error could be instantiated with a different subtype
  const { issuer, mint, brand, mintRecoveryPurse } = preparePaymentLedger(
    issuerZone,
    name,
    assetKind,
    cleanDisplayInfo,
    elementShape,
    recoverySetsState,
    optShutdownWithFailure,
  );

  return harden({
    brand,
    issuer,
    mint,
    mintRecoveryPurse,
    displayInfo: cleanDisplayInfo,
  });
};
harden(setupIssuerKit);

/** The key at which the issuer record is stored. */
const INSTANCE_KEY = 'issuer';
/**
 * The key at which the issuerKit's `RecoverySetsOption` state is stored.
 * Introduced by an upgrade, so may be absent on a predecessor incarnation. See
 * `RecoverySetsOption` for defaulting behavior.
 */
const RECOVERY_SETS_STATE = 'recoverySetsState';

/**
 * Used _only_ to upgrade a predecessor issuerKit. Use `makeDurableIssuerKit` to
 * make a new one.
 *
 * @template {AssetKind} K
 * @param {import('@agoric/vat-data').Baggage} issuerBaggage
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails in
 *   the middle of an atomic action (which btw should never happen), it
 *   potentially leaves its ledger in a corrupted state. If this function was
 *   provided, then the failed atomic action will call it, so that some larger
 *   unit of computation, like the enclosing vat, can be shutdown before
 *   anything else is corrupted by that corrupted state. See
 *   https://github.com/Agoric/agoric-sdk/issues/3434
 * @param {RecoverySetsOption} [recoverySetsOption] Added in upgrade, so last
 *   and optional. See `RecoverySetsOption` for defaulting behavior.
 * @returns {IssuerKit<K>}
 */
export const upgradeIssuerKit = (
  issuerBaggage,
  optShutdownWithFailure = undefined,
  recoverySetsOption = undefined,
) => {
  const issuerRecord = issuerBaggage.get(INSTANCE_KEY);
  const issuerZone = makeDurableZone(issuerBaggage);
  const oldRecoverySetsState = issuerBaggage.has(RECOVERY_SETS_STATE)
    ? issuerBaggage.get(RECOVERY_SETS_STATE)
    : 'hasRecoverySets';
  if (
    oldRecoverySetsState === 'noRecoverySets' &&
    recoverySetsOption === 'hasRecoverySets'
  ) {
    Fail`Cannot (yet?) upgrade from 'noRecoverySets' to 'hasRecoverySets'`;
  }
  // Extant sets are not currently deleted. If the new option is
  // 'noRecoverySets', they won't be used but extant ones will remain. Future
  // upgrades may make it possible to delete elements from them.
  const recoverySetsState = recoverySetsOption || oldRecoverySetsState;
  return setupIssuerKit(
    issuerRecord,
    issuerZone,
    recoverySetsState,
    optShutdownWithFailure,
  );
};
harden(upgradeIssuerKit);

/**
 * Does baggage already have an issuerKit?
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const hasIssuer = baggage => baggage.has(INSTANCE_KEY);

/**
 * `elementShape`, may only be present for collection-style amounts. If present,
 * it is a `Pattern` that every element of this issuerKits's amounts must
 * satisfy. For example, the Zoe Invitation issuerKit uses an elementShape
 * describing the invitation details for an individual invitation. An invitation
 * purse or payment has an amount that can only be a set of these. (Though
 * typically, the amount of an invitation payment is a singleton set. Such a
 * payment is often referred to in the singular as "an invitation".)
 *
 * `recoverySetsOption` added in upgrade. Note that `IssuerOptionsRecord` is
 * never stored, so we never need to worry about inheriting one from a
 * predecessor predating the introduction of recovery sets. See
 * `RecoverySetsOption` for defaulting behavior.
 *
 * @typedef {Partial<{
 *   elementShape: Pattern;
 *   recoverySetsOption: RecoverySetsOption;
 * }>} IssuerOptionsRecord
 */

/**
 * Used _only_ to make a _new_ durable issuer, i.e., the initial incarnation of
 * that issuer.
 *
 * @template {AssetKind} K The name becomes part of the brand in asset
 *   descriptions. The name is useful for debugging and double-checking
 *   assumptions, but should not be trusted wrt any external namespace. For
 *   example, anyone could create a new issuer kit with name 'BTC', but it is
 *   not bitcoin or even related. It is only the name according to that issuer
 *   and brand.
 *
 *   The assetKind will be used to import a specific mathHelpers from the
 *   mathHelpers library. For example, natMathHelpers, the default, is used for
 *   basic fungible tokens.
 *
 *   `displayInfo` gives information to the UI on how to display the amount.
 * @param {import('@agoric/vat-data').Baggage} issuerBaggage
 * @param {string} name
 * @param {K} [assetKind]
 * @param {AdditionalDisplayInfo} [displayInfo]
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails in
 *   the middle of an atomic action (which btw should never happen), it
 *   potentially leaves its ledger in a corrupted state. If this function was
 *   provided, then the failed atomic action will call it, so that some larger
 *   unit of computation, like the enclosing vat, can be shutdown before
 *   anything else is corrupted by that corrupted state. See
 *   https://github.com/Agoric/agoric-sdk/issues/3434
 * @param {IssuerOptionsRecord} [options]
 * @returns {IssuerKit<K>}
 */
export const makeDurableIssuerKit = (
  issuerBaggage,
  name,
  // @ts-expect-error K could be instantiated with a different subtype of AssetKind
  assetKind = AssetKind.NAT,
  displayInfo = harden({}),
  optShutdownWithFailure = undefined,
  { elementShape = undefined, recoverySetsOption = undefined } = {},
) => {
  const issuerData = harden({
    name,
    assetKind,
    displayInfo,
    elementShape,
  });
  issuerBaggage.init(INSTANCE_KEY, issuerData);
  const issuerZone = makeDurableZone(issuerBaggage);
  const recoverySetsState = recoverySetsOption || 'hasRecoverySets';
  issuerBaggage.init(RECOVERY_SETS_STATE, recoverySetsState);
  return setupIssuerKit(
    issuerData,
    issuerZone,
    recoverySetsState,
    optShutdownWithFailure,
  );
};
harden(makeDurableIssuerKit);

/**
 * Used to either revive a predecessor issuerKit, or to make a new durable one
 * if it is absent, and to place it in baggage for the next successor.
 *
 * @template {IssuerOptionsRecord} O
 * @template {AssetKind} K The name becomes part of the brand in asset
 *   descriptions. The name is useful for debugging and double-checking
 *   assumptions, but should not be trusted wrt any external namespace. For
 *   example, anyone could create a new issuer kit with name 'BTC', but it is
 *   not bitcoin or even related. It is only the name according to that issuer
 *   and brand.
 *
 *   The assetKind will be used to import a specific mathHelpers from the
 *   mathHelpers library. For example, natMathHelpers, the default, is used for
 *   basic fungible tokens.
 *
 *   `displayInfo` gives information to the UI on how to display the amount.
 * @param {import('@agoric/vat-data').Baggage} issuerBaggage
 * @param {string} name
 * @param {K} [assetKind]
 * @param {AdditionalDisplayInfo} [displayInfo]
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails in
 *   the middle of an atomic action (which btw should never happen), it
 *   potentially leaves its ledger in a corrupted state. If this function was
 *   provided, then the failed atomic action will call it, so that some larger
 *   unit of computation, like the enclosing vat, can be shutdown before
 *   anything else is corrupted by that corrupted state. See
 *   https://github.com/Agoric/agoric-sdk/issues/3434
 * @param {O} [options]
 * @returns {O['elementShape'] extends TypedPattern<infer T>
 *     ? IssuerKit<K, T>
 *     : IssuerKit<K>}
 */
export const prepareIssuerKit = (
  issuerBaggage,
  name,
  // @ts-expect-error K could be instantiated with a different subtype of AssetKind
  assetKind = AssetKind.NAT,
  displayInfo = harden({}),
  optShutdownWithFailure = undefined,
  // @ts-expect-error could have a different subtype of IssuerOptionsRecord
  options = {},
) => {
  if (hasIssuer(issuerBaggage)) {
    const { elementShape: _ = undefined, recoverySetsOption = undefined } =
      options;
    const issuerKit = upgradeIssuerKit(
      issuerBaggage,
      optShutdownWithFailure,
      recoverySetsOption,
    );

    // TODO check consistency with name, assetKind, displayInfo, elementShape.
    // Consistency either means that these are the same, or that they differ
    // in a direction we are prepared to upgrade. Note that it is the
    // responsibility of `upgradeIssuerKit` to check consistency of
    // `recoverySetsOption`, so continue to not do that here.

    // @ts-expect-error Type parameter confusion.
    return issuerKit;
  } else {
    const issuerKit = makeDurableIssuerKit(
      issuerBaggage,
      name,
      assetKind,
      displayInfo,
      optShutdownWithFailure,
      options,
    );
    // @ts-expect-error cast to the type parameter
    return issuerKit;
  }
};
harden(prepareIssuerKit);

/**
 * Used _only_ to make a new issuerKit that is effectively non-durable. This is
 * currently done by making a durable one in a baggage not reachable from
 * anywhere. TODO Once rebuilt on zones, this should instead just build on the
 * virtual zone. See https://github.com/Agoric/agoric-sdk/pull/7116
 *
 * Currently used for testing only. Should probably continue to be used for
 * testing only.
 *
 * @template {AssetKind} [K='nat']
 * @template {IssuerOptionsRecord} [O={}]
 * @param {string} name The name becomes part of the brand in asset
 *   descriptions. The name is useful for debugging and double-checking
 *   assumptions, but should not be trusted wrt any external namespace. For
 *   example, anyone could create a new issuer kit with name 'BTC', but it is
 *   not bitcoin or even related. It is only the name according to that issuer
 *   and brand.
 * @param {K} [assetKind] The assetKind will be used to import a specific
 *   mathHelpers from the mathHelpers library. For example, natMathHelpers, the
 *   default, is used for basic fungible tokens.
 * @param {AdditionalDisplayInfo} [displayInfo] `displayInfo` gives information
 *   to the UI on how to display the amount.
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails in
 *   the middle of an atomic action (which btw should never happen), it
 *   potentially leaves its ledger in a corrupted state. If this function was
 *   provided, then the failed atomic action will call it, so that some larger
 *   unit of computation, like the enclosing vat, can be shutdown before
 *   anything else is corrupted by that corrupted state. See
 *   https://github.com/Agoric/agoric-sdk/issues/3434
 * @param {O} [options]
 * @returns {O['elementShape'] extends TypedPattern<infer T>
 *     ? IssuerKit<K, T>
 *     : IssuerKit<K>}
 */
export const makeIssuerKit = (
  name,
  // @ts-expect-error K could be instantiated with a different subtype of AssetKind
  assetKind = AssetKind.NAT,
  displayInfo = harden({}),
  optShutdownWithFailure = undefined,
  // @ts-expect-error O could be instantiated with a different subtype
  { elementShape = undefined, recoverySetsOption = undefined } = {},
) =>
  // @ts-expect-error cast
  makeDurableIssuerKit(
    makeScalarBigMapStore('dropped issuer kit', { durable: true }),
    name,
    assetKind,
    displayInfo,
    optShutdownWithFailure,
    { elementShape, recoverySetsOption },
  );
harden(makeIssuerKit);
