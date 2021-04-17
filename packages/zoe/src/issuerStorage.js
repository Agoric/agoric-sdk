// @ts-check

import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import { arrayToObj } from './objArrayConversion';
import { cleanKeywords } from './cleanProposal';

export const makeIssuerStorage = () => {
  /** @type {WeakStore<Brand,IssuerRecord>} */
  const brandToIssuerRecord = makeNonVOWeakStore('brand');
  /** @type {WeakStore<Issuer,IssuerRecord>} */
  const issuerToIssuerRecord = makeNonVOWeakStore('issuer');

  const getByBrand = brandToIssuerRecord.get;

  const storeIssuerRecord = issuerRecord => {
    const { brand, issuer } = issuerRecord;
    brandToIssuerRecord.init(brand, issuerRecord);
    issuerToIssuerRecord.init(issuer, issuerRecord);
  };

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

  /**
   * For a local issuer, such as a ZCFMint issuer, store the
   * issuerRecord directly.
   *
   * @param {IssuerRecord} localIssuerRecord
   * @returns {IssuerRecord}
   */
  const storeLocalIssuerRecord = localIssuerRecord => {
    assert(
      !issuerToIssuerRecord.has(localIssuerRecord.issuer),
      `A local issuer should only ever be added once`,
    );
    storeIssuerRecord(localIssuerRecord);
    return getByBrand(localIssuerRecord.brand);
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

    const maths = arrayToObj(
      issuerRecords.map(record => record.amountMath),
      keywords,
    );

    return harden({
      issuers,
      brands,
      maths,
    });
  };

  const getBrandForIssuer = issuer => issuerToIssuerRecord.get(issuer).brand;
  const getIssuerForBrand = brand => brandToIssuerRecord.get(brand).issuer;

  return {
    storeIssuerKeywordRecord,
    storeIssuer,
    storeLocalIssuerRecord,
    getMathKind,
    getBrandForIssuer,
    getIssuerForBrand,
  };
};
