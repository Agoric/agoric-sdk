// @ts-check

import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import { arrayToObj } from './objArrayConversion';
import { cleanKeywords } from './cleanProposal';

/**
 *  Make the Issuer Storage. If `exportedIssuerStorage` is defined,
 *  then use it as the starting state.
 *
 * @param {ExportedIssuerStorage=} exportedIssuerStorage
 */
export const makeIssuerStorage = exportedIssuerStorage => {
  /** @type {WeakStore<Brand,IssuerRecord>} */
  const brandToIssuerRecord = makeNonVOWeakStore('brand');
  /** @type {WeakStore<Issuer,IssuerRecord>} */
  const issuerToIssuerRecord = makeNonVOWeakStore('issuer');

  /**
   * If we already know the entire issuer record, such as for a
   * ZCFMint issuer, or for an issuer that Zoe has told us about,
   * store the issuerRecord directly.
   *
   * @param {IssuerRecord} issuerRecord
   * @returns {IssuerRecord}
   */
  const storeIssuerRecord = issuerRecord => {
    const { brand, issuer } = issuerRecord;
    if (issuerToIssuerRecord.has(issuer)) {
      return issuerToIssuerRecord.get(issuer);
    }

    brandToIssuerRecord.init(brand, issuerRecord);
    issuerToIssuerRecord.init(issuer, issuerRecord);
    return issuerToIssuerRecord.get(issuer);
  };

  if (exportedIssuerStorage !== undefined) {
    exportedIssuerStorage.forEach(storeIssuerRecord);
  }

  const getByBrand = brandToIssuerRecord.get;

  /**
   * If the issuer is already stored, return the issuerRecord.
   * Otherwise, make and save the issuerRecord.
   *
   * @param {ERef<Issuer>} issuerP
   * @returns {Promise<IssuerRecord>}
   */
  const storeIssuer = async issuerP => {
    const brandP = E(issuerP).getBrand();
    const brandIssuerMatchP = E(brandP).isMyIssuer(issuerP);
    const displayInfoP = E(brandP).getDisplayInfo();
    const amountMathKindP = E(issuerP).getAmountMathKind();
    /** @type {[Issuer,Brand,boolean,AmountMathKind,any]} */
    const [
      issuer,
      brand,
      brandIssuerMatch,
      amountMathKind,
      displayInfo,
    ] = await Promise.all([
      issuerP,
      brandP,
      brandIssuerMatchP,
      amountMathKindP,
      displayInfoP,
    ]);
    // AWAIT /////

    if (issuerToIssuerRecord.has(issuer)) {
      return issuerToIssuerRecord.get(issuer);
    }

    assert(brandIssuerMatch, `issuer was using a brand which was not its own`);
    const issuerRecord = harden({
      brand,
      issuer,
      mathKind: amountMathKind,
      displayInfo: { ...displayInfo, amountMathKind },
    });
    storeIssuerRecord(issuerRecord);
    // AWAIT /////
    return getByBrand(brand);
  };

  const storeIssuers = issuers => Promise.all(issuers.map(storeIssuer));

  /** @type {GetMathKind} */
  const getMathKind = brand => getByBrand(brand).mathKind;

  /**
   *
   * @param {IssuerPKeywordRecord} uncleanIssuerKeywordRecord
   * @returns {Promise<{ issuers: IssuerKeywordRecord, brands:
   * BrandKeywordRecord }>}
   */
  const storeIssuerKeywordRecord = async uncleanIssuerKeywordRecord => {
    const keywords = cleanKeywords(uncleanIssuerKeywordRecord);
    const issuerPs = keywords.map(
      keyword => uncleanIssuerKeywordRecord[keyword],
    );
    // The issuers may not have been seen before, so we must wait for the
    // issuer records to be available synchronously
    const issuerRecords = await storeIssuers(issuerPs);

    const issuers = arrayToObj(
      issuerRecords.map(record => record.issuer),
      keywords,
    );
    const brands = arrayToObj(
      issuerRecords.map(record => record.brand),
      keywords,
    );

    return harden({
      issuers,
      brands,
    });
  };

  /**
   * @param {Issuer} issuer
   * @returns {Brand}
   */
  const getBrandForIssuer = issuer => issuerToIssuerRecord.get(issuer).brand;

  /**
   * @param {Brand} brand
   * @returns {Issuer}
   */
  const getIssuerForBrand = brand => brandToIssuerRecord.get(brand).issuer;

  /**
   * @param {Issuer[]} issuers
   * @returns {ExportedIssuerStorage}
   */
  const exportIssuerStorage = issuers => issuers.map(issuerToIssuerRecord.get);

  return {
    storeIssuerKeywordRecord,
    storeIssuer,
    storeIssuerRecord,
    getMathKind,
    getBrandForIssuer,
    getIssuerForBrand,
    exportIssuerStorage,
  };
};
