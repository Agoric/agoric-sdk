// @ts-check
// @jessie-check

import { makeIssuerKit } from '@agoric/ertp';

/**
 * This contract holds one mint; it basically wraps
 * makeIssuerKit in its own contract, and hence in
 * its own vat.
 *
 * @type ContractStartFn<Issuer, Mint, {
 *   keyword: string,
 *   assetKind: AssetKind,
 *   displayInfo: DisplayInfo,
 * }>
 */
export const start = zcf => {
  const { keyword, assetKind, displayInfo } = zcf.getTerms();

  const { mint, issuer } = makeIssuerKit(keyword, assetKind, displayInfo);

  return {
    // @ts-expect-error not remotable. ??? should it be?
    publicFacet: issuer,
    // @ts-expect-error not remotable. ??? should it be?
    creatorFacet: mint,
  };
};
harden(start);
