// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { assertKeywordName, getKeywords } from './cleanProposal';

/**
 * @callback AddIssuerToInstanceRecord
 *
 * Add an issuer and its keyword to the instanceRecord for the
 * contract instance
 *
 * @param {Keyword} keyword
 * @param {IssuerRecord} issuerRecord
 * @returns {void}
 */

/**
 * @callback GetInstanceRecord
 * @returns {InstanceRecord}
 */

/**
 *
 * @typedef {{ addIssuerToInstanceRecord: AddIssuerToInstanceRecord,
 * getInstanceRecord: GetInstanceRecord, getTerms: () => Terms,
 * getIssuers: () => IssuerKeywordRecord,
 * getBrands: () => BrandKeywordRecord, assertUniqueKeyword: (keyword:
 * Keyword) => void }} InstanceRecordManager
 */

/**
 *
 * @param {InstanceRecord} instanceRecord
 * @returns {InstanceRecordManager}
 */
export const makeInstanceRecordStorage = instanceRecord => {
  const addIssuerToInstanceRecord = (keyword, issuerRecord) => {
    instanceRecord = {
      ...instanceRecord,
      terms: {
        ...instanceRecord.terms,
        issuers: {
          ...instanceRecord.terms.issuers,
          [keyword]: issuerRecord.issuer,
        },
        brands: {
          ...instanceRecord.terms.brands,
          [keyword]: issuerRecord.brand,
        },
      },
    };
  };

  const getInstanceRecord = () => harden(instanceRecord);
  const getTerms = () => instanceRecord.terms;
  const getIssuers = () => instanceRecord.terms.issuers;
  const getBrands = () => instanceRecord.terms.brands;

  const assertUniqueKeyword = keyword => {
    assertKeywordName(keyword);
    assert(
      !getKeywords(instanceRecord.terms.issuers).includes(keyword),
      X`keyword ${q(keyword)} must be unique`,
    );
  };

  return {
    addIssuerToInstanceRecord,
    getInstanceRecord,
    getTerms,
    getIssuers,
    getBrands,
    assertUniqueKeyword,
  };
};

/**
 * Put together the instance record
 *
 * @param {Installation} installation
 * @param {Object} customTerms
 * @param {IssuerKeywordRecord} issuers
 * @param {BrandKeywordRecord} brands
 * @returns {InstanceRecordManager}
 */
export const makeInstanceRecordAndStore = (
  installation,
  customTerms,
  issuers,
  brands,
) => {
  const instanceRecord = harden({
    installation,
    terms: {
      ...customTerms,
      issuers,
      brands,
    },
  });

  return makeInstanceRecordStorage(instanceRecord);
};
