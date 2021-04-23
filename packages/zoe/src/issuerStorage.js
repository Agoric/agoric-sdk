// @ts-check

import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import { arrayToObj } from './objArrayConversion';
import { cleanKeywords } from './cleanProposal';
import { makeIssuerRecord } from './issuerRecord';

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
   * A note on checking that the issuer and brand match: Because of
   * how we use `storeIssuerRecord`, the issuer and brand in the
   * `issuerRecord` parameter are guaranteed to match, and we do not
   * need to do another asynchronous call.
   *
   * We use `storeIssuerRecord` in 4 cases: 1) ZoeMint records, 2)
   * ZCFMint records, 3) within `storeIssuer`, and 4) storing an
   * issuer record in ZCF that we obtained from Zoe that originally
   * went through `storeIssuer`. In ZoeMints (repackaged as ZCFMints),
   * we create the issuers and brands ourselves using ERTP directly,
   * so we know they are not malicious and that the issuers and brands
   * match. In the last two cases, we go through the
   * brand-issuer-match check in `storeIssuer`.
   *
   * The reason why we need the `has` check below is for the 4th case
   * above, in which we store an issuer record in ZCF that we obtained
   * from Zoe. `WeakStore.init` errors if the key is already present,
   * and because an issuer can be used more than once in the same
   * contract, we need to make sure we aren't trying to `init` twice.
   * If the issuer and its record are already present, we do not need
   * to add the issuer again in ZCF.
   *
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
    const issuerRecord = makeIssuerRecord(
      brand,
      issuer,
      amountMathKind,
      displayInfo,
    );
    storeIssuerRecord(issuerRecord);
    return getByBrand(brand);
  };

  const storeIssuers = issuers => Promise.all(issuers.map(storeIssuer));

  /** @type {GetMathKind} */
  const getMathKind = brand => getByBrand(brand).mathKind;

  /**
   *
   * @param {IssuerPKeywordRecord} uncleanIssuerKeywordRecord
   * @returns {Promise<{ issuers: IssuerKeywordRecord,
   *                     brands: BrandKeywordRecord }>}
   */
  const storeIssuerKeywordRecord = async uncleanIssuerKeywordRecord => {
    const keywords = cleanKeywords(uncleanIssuerKeywordRecord);
    const issuerPs = keywords.map(
      keyword => uncleanIssuerKeywordRecord[keyword],
    );
    // The issuers may not have been seen before, so we must wait for the
    // issuer records to be available synchronously
    const issuerRecords = await storeIssuers(issuerPs);
    // AWAIT ///

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
