// @jessie-check

import { assert } from '@agoric/assert';
import { assertPattern } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { AssetKind, assertAssetKind } from './amountMath.js';
import { coerceDisplayInfo } from './displayInfo.js';
import { preparePaymentLedger } from './paymentLedger.js';

import './types-ambient.js';

/** @typedef {import('@agoric/zone').Zone} Zone */
/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @template {AssetKind} K
 * @typedef {object} IssuerRecord
 * @property {string} name
 * @property {K} assetKind
 * @property {AdditionalDisplayInfo} displayInfo
 * @property {Pattern} elementShape
 */

/**
 * @template {AssetKind} K
 * @param {IssuerRecord<K>} issuerRecord
 * @param {Zone} issuerZone
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails
 * in the middle of an atomic action (which btw should never happen), it
 * potentially leaves its ledger in a corrupted state. If this function was
 * provided, then the failed atomic action will call it, so that some
 * larger unit of computation, like the enclosing vat, can be shutdown
 * before anything else is corrupted by that corrupted state.
 * See https://github.com/Agoric/agoric-sdk/issues/3434
 * @returns {IssuerKit<K>}
 */
const setupIssuerKit = (
  { name, assetKind, displayInfo, elementShape },
  issuerZone,
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
  // @ts-expect-error could be instantiated with different subtype of AssetKind
  const { issuer, mint, brand, mintRecoveryPurse } = preparePaymentLedger(
    issuerZone,
    name,
    assetKind,
    cleanDisplayInfo,
    elementShape,
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
 * @template {AssetKind} K
 * @param {Baggage} issuerBaggage
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails
 * in the middle of an atomic action (which btw should never happen), it
 * potentially leaves its ledger in a corrupted state. If this function was
 * provided, then the failed atomic action will call it, so that some
 * larger unit of computation, like the enclosing vat, can be shutdown
 * before anything else is corrupted by that corrupted state.
 * See https://github.com/Agoric/agoric-sdk/issues/3434
 * @returns {IssuerKit<K>}
 */
export const prepareIssuerKit = (
  issuerBaggage,
  optShutdownWithFailure = undefined,
) => {
  const issuerRecord = issuerBaggage.get(INSTANCE_KEY);
  const issuerZone = makeDurableZone(issuerBaggage);
  return setupIssuerKit(issuerRecord, issuerZone, optShutdownWithFailure);
};
harden(prepareIssuerKit);

/**
 * Does baggage already have an issuer from prepareIssuerKit()?
 * That is: does it have the relevant keys defined?
 *
 * @param {Baggage} baggage
 */
export const hasIssuer = baggage => baggage.has(INSTANCE_KEY);

/**
 * @typedef {Partial<{elementShape: Pattern}>} IssuerOptionsRecord
 */

/**
 * @template {AssetKind} K
 * The name becomes part of the brand in asset descriptions.
 * The name is useful for debugging and double-checking
 * assumptions, but should not be trusted wrt any external namespace.
 * For example, anyone could create a new issuer kit with name 'BTC', but
 * it is not bitcoin or even related. It is only the name according
 * to that issuer and brand.
 *
 * The assetKind will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 *  `displayInfo` gives information to the UI on how to display the amount.
 *
 * @param {Baggage} issuerBaggage
 * @param {string} name
 * @param {K} [assetKind=AssetKind.NAT]
 * @param {AdditionalDisplayInfo} [displayInfo={}]
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails
 * in the middle of an atomic action (which btw should never happen), it
 * potentially leaves its ledger in a corrupted state. If this function was
 * provided, then the failed atomic action will call it, so that some
 * larger unit of computation, like the enclosing vat, can be shutdown
 * before anything else is corrupted by that corrupted state.
 * See https://github.com/Agoric/agoric-sdk/issues/3434
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
  { elementShape = undefined } = {},
) => {
  const issuerData = harden({ name, assetKind, displayInfo, elementShape });
  issuerBaggage.init(INSTANCE_KEY, issuerData);
  const issuerZone = makeDurableZone(issuerBaggage);
  return setupIssuerKit(issuerData, issuerZone, optShutdownWithFailure);
};
harden(makeDurableIssuerKit);

/**
 * @template {AssetKind} [K='nat']
 * The name becomes part of the brand in asset descriptions.
 * The name is useful for debugging and double-checking
 * assumptions, but should not be trusted wrt any external namespace.
 * For example, anyone could create a new issuer kit with name 'BTC', but
 * it is not bitcoin or even related. It is only the name according
 * to that issuer and brand.
 *
 * The assetKind will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 *  `displayInfo` gives information to the UI on how to display the amount.
 *
 * @param {string} name
 * @param {K} [assetKind='nat']
 * @param {AdditionalDisplayInfo} [displayInfo={}]
 * @param {ShutdownWithFailure} [optShutdownWithFailure] If this issuer fails
 * in the middle of an atomic action (which btw should never happen), it
 * potentially leaves its ledger in a corrupted state. If this function was
 * provided, then the failed atomic action will call it, so that some
 * larger unit of computation, like the enclosing vat, can be shutdown
 * before anything else is corrupted by that corrupted state.
 * See https://github.com/Agoric/agoric-sdk/issues/3434
 * @param {IssuerOptionsRecord} [options]
 * @returns {IssuerKit<K>}
 */
export const makeIssuerKit = (
  name,
  // @ts-expect-error K could be instantiated with a different subtype of AssetKind
  assetKind = AssetKind.NAT,
  displayInfo = harden({}),
  optShutdownWithFailure = undefined,
  { elementShape = undefined } = {},
) =>
  makeDurableIssuerKit(
    makeScalarBigMapStore('dropped issuer kit', { durable: true }),
    name,
    assetKind,
    displayInfo,
    optShutdownWithFailure,
    { elementShape },
  );
harden(makeIssuerKit);
