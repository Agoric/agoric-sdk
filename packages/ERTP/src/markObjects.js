import { Far } from '@agoric/marshal';

/** @type {ERTPKind} */
export const ERTPKind = {
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

/** @type {MakeFarName} */
export const makeFarName = (allegedName, kind) => `${allegedName} ${kind}`;

export const markBrand = (allegedName, brand) =>
  Far(makeFarName(allegedName, ERTPKind.BRAND), brand);

export const markIssuer = (allegedName, issuer) =>
  Far(makeFarName(allegedName, ERTPKind.ISSUER), issuer);

export const markMint = (allegedName, mint) =>
  Far(makeFarName(allegedName, ERTPKind.MINT), mint);

export const markDepositFacet = (allegedName, depositFacet) =>
  Far(makeFarName(allegedName, ERTPKind.DEPOSIT_FACET), depositFacet);

export const markPurse = (allegedName, purse) =>
  Far(makeFarName(allegedName, ERTPKind.PURSE), purse);

export const markPayment = (allegedName, payment) =>
  Far(makeFarName(allegedName, ERTPKind.PAYMENT), payment);
