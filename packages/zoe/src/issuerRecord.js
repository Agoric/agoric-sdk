// @jessie-check

/**
 * Put together information about the issuer in a standard format that
 * is synchronously accessible.
 *
 * @template {AssetKind} K
 * @param {Brand<K>} brand
 * @param {Issuer<K>} issuer
 * @param {DisplayInfo<K>} displayInfo
 * @returns {IssuerRecord<K>}
 */
export const makeIssuerRecord = (brand, issuer, displayInfo) =>
  harden({
    brand,
    issuer,
    assetKind: displayInfo.assetKind,
    displayInfo,
  });
