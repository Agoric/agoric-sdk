// @jessie-check

import { prepareIssuerKit } from '@agoric/ertp';

/** @import {Baggage} from '@agoric/vat-data' */

/**
 * NOTE: "keyword" connotes initial caps constraint, which doesn't apply here.
 *
 * @template {AssetKind} K
 * @typedef {{
 *   keyword: string;
 *   assetKind: K;
 *   displayInfo: DisplayInfo;
 * }} IssuerInfo<K>
 */

/**
 * @template {AssetKind} K
 * @param {ZCF<IssuerInfo<K>>} zcf
 * @param {Baggage} baggage
 */
function provideIssuerKit(zcf, baggage) {
  const { keyword, assetKind, displayInfo } = zcf.getTerms();
  return prepareIssuerKit(baggage, keyword, assetKind, displayInfo);
}

/** @type {ContractMeta<typeof start>} */
export const meta = {
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * This contract holds one mint; it basically wraps makeIssuerKit in its own
 * contract, and hence in its own vat.
 *
 * @template {AssetKind} K
 * @param {ZCF<IssuerInfo<K>>} zcf
 * @param {undefined} _privateArgs
 * @param {Baggage} instanceBaggage
 */
export const start = (zcf, _privateArgs, instanceBaggage) => {
  const { mint, issuer } = provideIssuerKit(zcf, instanceBaggage);

  return {
    publicFacet: issuer,
    creatorFacet: mint,
  };
};
harden(start);
