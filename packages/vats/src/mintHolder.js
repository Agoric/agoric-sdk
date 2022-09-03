// @ts-check
// @jessie-check

import { makeDurableIssuerKit } from '@agoric/ertp';

/**
 * This contract holds one mint; it basically wraps
 * makeIssuerKit in its own contract, and hence in
 * its own vat.
 *
 * @template {AssetKind} K
 * @param {ZCF<{
 *   keyword: string,
 *   assetKind: K,
 *   displayInfo: DisplayInfo,
 * }>} zcf
 * @param {unknown} _privateArgs
 * @param {import('@agoric/vat-data').Baggage} instanceBaggage
 */
export const vivify = (zcf, _privateArgs, instanceBaggage) => {
  const { keyword, assetKind, displayInfo } = zcf.getTerms();

  const { mint, issuer } = makeDurableIssuerKit(
    instanceBaggage,
    keyword,
    assetKind,
    displayInfo,
  );

  return {
    publicFacet: issuer,
    creatorFacet: mint,
  };
};
harden(vivify);
