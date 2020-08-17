// @ts-check

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

import makeWeakStore from '@agoric/weak-store';
import { makeLocalAmountMath } from '@agoric/ertp';
import { makeTable, makeValidateProperties } from './table';

import '../exported';
import './internal-types';

/**
 * @template K,V
 * @typedef {import('@agoric/weak-store').WeakStore<K,V>} WeakStore
 */

// Issuer Table key: brand
// Columns: brand | issuer | amountMath
//
// The IssuerTable is keyed by brand, but the Issuer is required in order for
// getPromiseForIssuerRecord() to initialize the records. When
// getPromiseForIssuerRecord is called and the record doesn't exist, it stores a
// promise for the record in issuersInProgress, and then builds the record. It
// updates the tables when done.
//
const makeIssuerTable = () => {
  /**
   * TODO: make sure this validate function protects against malicious
   * misshapen objects rather than just a general check.
   * @type {Validator<IssuerRecord>}
   */
  const validateSomewhat = makeValidateProperties([
    'brand',
    'issuer',
    'amountMath',
  ]);

  /** @param {Table<IssuerRecord>} table */
  const makeCustomMethods = table => {
    /** @type {WeakStore<Issuer, Promise<IssuerRecord>>} */
    const issuersInProgress = makeWeakStore('issuer');

    /** @type {WeakStore<Issuer,Brand>} */
    const issuerToBrand = makeWeakStore('issuer');

    const initIssuerRecord = issuerRecord => {
      const { brand, issuer } = issuerRecord;
      table.create(issuerRecord, brand);
      issuerToBrand.init(issuer, brand);
    };

    // We can't be sure we can build the table entry soon enough that the first
    // caller will get the actual data, so we start by saving a promise in the
    // inProgress table, and once we have the Issuer, build the record, fill in
    // the table, and resolve the promise.
    /**
     * @param {Issuer} issuer
     */
    function buildTableEntryAndPlaceHolder(issuer) {
      // remote calls which immediately return a promise
      const brandP = E(issuer).getBrand();
      const brandIssuerMatchP = E(brandP).isMyIssuer(issuer);
      const localAmountMathP = makeLocalAmountMath(issuer);

      /**
       * @type {[
       *  PromiseLike<Brand>,
       *  PromiseLike<boolean>,
       *  PromiseLike<AmountMath>,
       * ]}
       * */
      const promiseArray = [brandP, brandIssuerMatchP, localAmountMathP];
      // a promise for a synchronously accessible record
      const synchronousRecordP = Promise.all(promiseArray).then(
        ([brand, brandIssuerMatch, amountMath]) => {
          assert(
            brandIssuerMatch,
            `issuer was using a brand which was not its own`,
          );
          const issuerRecord = {
            brand,
            issuer,
            amountMath,
          };
          initIssuerRecord(issuerRecord);
          issuersInProgress.delete(issuer);
          return table.get(brand);
        },
      );
      issuersInProgress.init(issuer, synchronousRecordP);
      return synchronousRecordP;
    }

    const customMethods = harden({
      // `issuerP` may be a promise, presence, or local object. If there's
      // already a record, or already a promise for a record, return it.
      // Otherwise wrap a promise around building the record so we can return
      // the promise until we build the record.
      getPromiseForIssuerRecord: issuerP => {
        return Promise.resolve(issuerP).then(issuer => {
          if (issuerToBrand.has(issuer)) {
            // we always initialize table and issuerToBrand together
            return table.get(issuerToBrand.get(issuer));
            // eslint-disable-next-line no-else-return
          } else if (issuersInProgress.has(issuer)) {
            // a promise which resolves to the issuer record
            return issuersInProgress.get(issuer);
            // eslint-disable-next-line no-else-return
          } else {
            return buildTableEntryAndPlaceHolder(issuer);
          }
        });
      },
      initIssuerRecord,
      // Synchronous, but throws if not present.
      getIssuerRecordByIssuer: issuer => table.get(issuerToBrand.get(issuer)),
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, 'brand', makeCustomMethods);
};

export { makeIssuerTable };
