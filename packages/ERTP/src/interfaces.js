import { assert, details, q, an } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

/**
 * @type {{ISSUER: 'issuer', BRAND: 'brand', PURSE: 'purse', PAYMENT:
 * 'payment', MINT: 'mint' }}
 */
const ERTPKind = {
  ISSUER: 'issuer',
  BRAND: 'brand',
  PURSE: 'purse',
  PAYMENT: 'payment',
  MINT: 'mint',
  // TODO: improve implementation such that spaces can be used in
  // ERTPKind. Currently we assume that the ERTPKind is the last
  // element of the interface, after we split on spaces.
  DEPOSIT_FACET: 'depositFacet',
};

/**
 * Return the last element of an array
 *
 * @param {Array} array
 * @returns {any} element
 */
const last = array => array[array.length - 1];

/**
 * Make the interface using the allegedName and kind. The particular
 * structure may change in the future to be more sophisticated.
 * Therefore, ERTP and Zoe should not depend on this particular
 * implementation.
 *
 * @param {string} allegedName The allegedName, as passed to
 *  `makeIssuerKit`
 * @param {string} kind The ERTPKind
 */
const makeInterface = (allegedName, kind) => `Alleged: ${allegedName} ${kind}`;

/**
 * Make a function that asserts that the `maybeRemotableP` (which may
 * be a local object, a presence, or a promise for either) is of the
 * provided `kind`. Note that this depends on the particular
 * implementation of `makeInterface` and the two functions should be
 * refactored together.
 *
 * @param {GetInterfaceOf} getInterfaceOf
 * @param {string} kind - The ERTPKind to assert
 */
const makeAssertKindWhen = (getInterfaceOf, kind) => maybeRemotableP => {
  return E.when(maybeRemotableP, maybeRemotable => {
    const iface = getInterfaceOf(maybeRemotable);
    const detailsMsg = details`${maybeRemotableP} must be ${q(
      an(kind),
    )} or a promise for ${q(an(kind))}`;
    assert(iface, detailsMsg);
    assert(kind === last(iface.split(' ')), detailsMsg);
  });
};

/** @type {MakeBrandInterface} */
export const makeBrandInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.BRAND);

/** @type {MakeIssuerInterface} */
export const makeIssuerInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.ISSUER);

/** @type {MakePurseInterface} */
export const makePurseInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.PURSE);

/** @type {MakePaymentInterface} */
export const makePaymentInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.PAYMENT);

/** @type {MakeMintInterface} */
export const makeMintInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.MINT);

/** @type {MakeDepositFacetInterface} */
export const makeDepositFacetInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.DEPOSIT_FACET);

/** @type {MakeAssertAllegedIssuerWhen} */
export const makeAssertAllegedIssuerWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.ISSUER);

/** @type {MakeAssertAllegedBrandWhen} */
export const makeAssertAllegedBrandWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.BRAND);

/** @type {MakeAssertAllegedPurseWhen} */
export const makeAssertAllegedPurseWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.PURSE);

/** @type {MakeAssertAllegedPaymentWhen} */
export const makeAssertAllegedPaymentWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.PAYMENT);

/** @type {MakeAssertAllegedMintWhen} */
export const makeAssertAllegedMintWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.MINT);

/** @type {MakeAssertAllegedDepositFacetWhen} */
export const makeAssertAllegedDepositFacetWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.DEPOSIT_FACET);
