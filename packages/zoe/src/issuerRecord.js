// @jessie-check
import { Fail } from '@endo/errors';

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

/**
 * @param {IssuerRecord} issuerRecord
 * @returns {asserts issuerRecord is Required<IssuerRecord>}
 */
export const assertFullIssuerRecord = issuerRecord => {
  if (!issuerRecord.displayInfo) {
    throw Fail`full IssuerRecord requires displayInfo`;
  }
};
