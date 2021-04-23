// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { assertKeywordName, getKeywords } from './cleanProposal';

/**
 * The InstanceRecord stores the installation, customTerms, issuers,
 * and brands for a particular Zoe contract instance. The installation
 * and customTerms are never changed, but new issuers (and their
 * matching brands) may be added by the contract code. Thus, an
 * InstanceRecord may be outdated at any particular point. This file
 * manages the creation and updating of an InstanceRecord and returns
 * functions for getting the latest data.
 */

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
 * getInstanceRecord: GetInstanceRecord,
 * getTerms: () => Terms,
 * getIssuers: () => IssuerKeywordRecord,
 * getBrands: () => BrandKeywordRecord,
 * assertUniqueKeyword: (keyword: Keyword) => void }} InstanceRecordManager
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

  return harden({
    addIssuerToInstanceRecord,
    getInstanceRecord,
    getTerms,
    getIssuers,
    getBrands,
    assertUniqueKeyword,
  });
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
export const makeAndStoreInstanceRecord = (
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
