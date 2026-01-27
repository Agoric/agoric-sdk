// @jessie-check
import { Fail } from '@endo/errors';

/**
 * @import {AssetKind, Brand, DisplayInfo, Issuer, IssuerRecord} from '@agoric/ertp';
 * @import {ZoeIssuerRecord} from './types-index.js';
 */

/**
 * Put together information about the issuer in a standard format that
 * is synchronously accessible.
 *
 * @template {AssetKind} K
 * @param {Brand<K>} brand
 * @param {Issuer<K>} issuer
 * @param {DisplayInfo<K>} displayInfo
 * @returns {ZoeIssuerRecord<K>}
 */
export const makeIssuerRecord = (brand, issuer, displayInfo) =>
  harden({
    brand,
    issuer,
    assetKind: displayInfo.assetKind,
    displayInfo,
  });

/**
 * @param {IssuerRecord<any>} issuerRecord
 * @returns {asserts issuerRecord is Required<IssuerRecord<any>>}
 */
export const assertFullIssuerRecord = issuerRecord => {
  if (!issuerRecord.displayInfo) {
    throw Fail`full IssuerRecord requires displayInfo`;
  }
};
