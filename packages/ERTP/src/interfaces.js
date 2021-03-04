// @ts-check

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

/** @type {MakeInterface} */
export const makeInterface = (allegedName, kind) =>
  `Alleged: ${allegedName} ${kind}`;
