// @ts-check
// @jessie-check

import { assert } from '@agoric/assert';
import { assertPattern } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { AssetKind, assertAssetKind } from './amountMath.js';
import { coerceDisplayInfo } from './displayInfo.js';
import { makeDurablePaymentLedger } from './paymentLedger.js';

import './types.js';

/**
 * @template {AssetKind} K
 * The allegedName becomes part of the brand in asset descriptions. The
 * allegedName doesn't have to be a string, but it will only be used for
 * its value. The allegedName is useful for debugging and double-checking
 * assumptions, but should not be trusted.
 *
 * The assetKind will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 *  `displayInfo` gives information to the UI on how to display the amount.
 *
 * @param {MapStore<string,any>} issuerBaggage
 * @param {ShutdownWithFailure=} optShutdownWithFailure If this issuer fails
 * in the middle of an atomic action (which btw should never happen), it
 * potentially leaves its ledger in a corrupted state. If this function was
 * provided, then the failed atomic action will call it, so that some
 * larger unit of computation, like the enclosing vat, can be shutdown
 * before anything else is corrupted by that corrupted state.
 * See https://github.com/Agoric/agoric-sdk/issues/3434
 * @returns {{
 *  mint: Mint<K>,
 *  issuer: Issuer<K>,
 *  brand: Brand<K>,
 *  displayInfo: DisplayInfo,
 * }}
 */
export const provideDurableIssuerKit = (
  issuerBaggage,
  optShutdownWithFailure = undefined,
) => {
  const allegedName = issuerBaggage.get('allegedName');
  const assetKind = issuerBaggage.get('assetKind');
  const displayInfo = issuerBaggage.get('displayInfo');
  const elementSchema = issuerBaggage.get('elementSchema');
  assert.typeof(allegedName, 'string');
  assertAssetKind(assetKind);

  // Add assetKind to displayInfo, or override if present
  const cleanDisplayInfo = coerceDisplayInfo(displayInfo, assetKind);
  if (optShutdownWithFailure !== undefined) {
    assert.typeof(optShutdownWithFailure, 'function');
  }

  if (elementSchema !== undefined) {
    assertPattern(elementSchema);
  }

  // Attenuate the powerful authority to mint and change balances
  const { issuer, mint, brand } = makeDurablePaymentLedger(
    issuerBaggage,
    allegedName,
    assetKind,
    cleanDisplayInfo,
    elementSchema,
    optShutdownWithFailure,
  );

  return harden({
    brand,
    issuer,
    mint,
    displayInfo: cleanDisplayInfo,
  });
};
harden(provideDurableIssuerKit);

/** @typedef {ReturnType<typeof makeDurableIssuerKit>} IssuerKit */

/**
 * @template {AssetKind} K
 * The allegedName becomes part of the brand in asset descriptions. The
 * allegedName doesn't have to be a string, but it will only be used for
 * its value. The allegedName is useful for debugging and double-checking
 * assumptions, but should not be trusted.
 *
 * The assetKind will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 *  `displayInfo` gives information to the UI on how to display the amount.
 *
 * @param {MapStore<string,any>} issuerBaggage
 * @param {string} allegedName
 * @param {K} [assetKind=AssetKind.NAT]
 * @param {AdditionalDisplayInfo} [displayInfo={}]
 * @param {ShutdownWithFailure=} optShutdownWithFailure If this issuer fails
 * in the middle of an atomic action (which btw should never happen), it
 * potentially leaves its ledger in a corrupted state. If this function was
 * provided, then the failed atomic action will call it, so that some
 * larger unit of computation, like the enclosing vat, can be shutdown
 * before anything else is corrupted by that corrupted state.
 * See https://github.com/Agoric/agoric-sdk/issues/3434
 * @param {Partial<{elementSchema: Pattern}>} [options]
 * @returns {{
 *  mint: Mint<K>,
 *  issuer: Issuer<K>,
 *  brand: Brand<K>,
 *  displayInfo: DisplayInfo,
 * }}
 */
export const makeDurableIssuerKit = (
  issuerBaggage,
  allegedName,
  // @ts-expect-error K could be instantiated with a different subtype of AssetKind
  assetKind = AssetKind.NAT,
  displayInfo = harden({}),
  optShutdownWithFailure = undefined,
  { elementSchema = undefined } = {},
) => {
  issuerBaggage.init('allegedName', allegedName);
  issuerBaggage.init('assetKind', assetKind);
  issuerBaggage.init('displayInfo', displayInfo);
  issuerBaggage.init('elementSchema', elementSchema);
  return provideDurableIssuerKit(issuerBaggage, optShutdownWithFailure);
};
harden(makeDurableIssuerKit);

/**
 * @template {AssetKind} K
 * The allegedName becomes part of the brand in asset descriptions. The
 * allegedName doesn't have to be a string, but it will only be used for
 * its value. The allegedName is useful for debugging and double-checking
 * assumptions, but should not be trusted.
 *
 * The assetKind will be used to import a specific mathHelpers
 * from the mathHelpers library. For example, natMathHelpers, the
 * default, is used for basic fungible tokens.
 *
 *  `displayInfo` gives information to the UI on how to display the amount.
 *
 * @param {string} allegedName
 * @param {K} [assetKind=AssetKind.NAT]
 * @param {AdditionalDisplayInfo} [displayInfo={}]
 * @param {ShutdownWithFailure=} optShutdownWithFailure If this issuer fails
 * in the middle of an atomic action (which btw should never happen), it
 * potentially leaves its ledger in a corrupted state. If this function was
 * provided, then the failed atomic action will call it, so that some
 * larger unit of computation, like the enclosing vat, can be shutdown
 * before anything else is corrupted by that corrupted state.
 * See https://github.com/Agoric/agoric-sdk/issues/3434
 * @param {Partial<{elementSchema: Pattern}>} [options]
 * @returns {{
 *  mint: Mint<K>,
 *  issuer: Issuer<K>,
 *  brand: Brand<K>,
 *  displayInfo: DisplayInfo,
 * }}
 */
export const makeIssuerKit = (
  allegedName,
  // @ts-expect-error K could be instantiated with a different subtype of AssetKind
  assetKind = AssetKind.NAT,
  displayInfo = harden({}),
  optShutdownWithFailure = undefined,
  { elementSchema = undefined } = {},
) =>
  makeDurableIssuerKit(
    makeScalarBigMapStore('dropped issuer kit', { durable: true }),
    allegedName,
    assetKind,
    displayInfo,
    optShutdownWithFailure,
    { elementSchema },
  );
harden(makeIssuerKit);
