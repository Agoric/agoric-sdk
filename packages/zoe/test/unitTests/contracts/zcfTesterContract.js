/* global harden */
// @ts-check

import { assert } from '@agoric/assert';

/**
 * Tests ZCF
 *
 * @typedef {import('../../../src/zoe').ContractFacet} ContractFacet
 * @typedef {import('@agoric/ERTP').Amount} Amount
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { brandKeywordRecord, issuerKeywordRecord } = zcf.getInstanceRecord();
  Object.keys(brandKeywordRecord).forEach(keyword => {
    // TODO: import tap/tape and do t.equals
    assert.equal(
      zcf.getIssuerForBrand(brandKeywordRecord[keyword]),
      issuerKeywordRecord[keyword],
    );
  });
  return zcf.makeInvitation(() => {}, 'test');
};

harden(makeContract);
export { makeContract };
