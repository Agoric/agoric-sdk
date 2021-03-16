// @ts-check

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import { makeWeakStore } from '@agoric/store';
import { makeAmountMath } from '@agoric/ertp';

import '../exported';
import './internal-types';

/**
 * IssuerTable
 *
 * Key: Brand or Issuer
 *
 * Record: { brand, issuer, amountMath }
 *
 * To save an issuerRecord, pass the full record to
 * `initIssuerByRecord` (synchronous), or more commonly, pass an
 * issuer to `initIssuer` (asynchronous). `initIssuer` will make the
 * remote calls to get the brand and amountMath and save them.
 */
const makeIssuerTable = () => {
  /** @type {WeakStore<Brand,IssuerRecord>} */
  const brandToIssuerRecord = makeWeakStore('brand');
  /** @type {WeakStore<Issuer,IssuerRecord>} */
  const issuerToIssuerRecord = makeWeakStore('issuer');

  /** @type {IssuerTable} */
  const issuerTable = {
    hasByBrand: brandToIssuerRecord.has,
    getByBrand: brandToIssuerRecord.get,
    hasByIssuer: issuerToIssuerRecord.has,
    getByIssuer: issuerToIssuerRecord.get,
    // `issuerP` may be a promise, presence, or local object. If there's
    // already a record, return it. Otherwise, save the record.
    initIssuer: async issuerP => {
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
      assert(
        brandIssuerMatch,
        `issuer was using a brand which was not its own`,
      );
      const amountMath = makeAmountMath(brand, amountMathKind);
      issuerTable.initIssuerByRecord({
        brand,
        issuer,
        amountMath,
        mathKind: amountMathKind,
        displayInfo: { ...displayInfo, amountMathKind },
      });
      return issuerTable.getByBrand(brand);
    },
    initIssuerByRecord: issuerRecord => {
      const { brand, issuer } = issuerRecord;
      brandToIssuerRecord.init(brand, issuerRecord);
      issuerToIssuerRecord.init(issuer, issuerRecord);
    },
  };

  return issuerTable;
};

export { makeIssuerTable };
