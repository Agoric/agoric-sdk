/* global harden */

import { E } from '@agoric/eventual-send';

import makeStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import { makeTable, makeValidateProperties } from './table';

/**
 * @typedef {import('./zoe').OfferHandle} OfferHandle
 * @typedef {import('@agoric/ertp').Payment} Payment
 */

// Installation Table
// Columns: handle | installation | bundle
const makeInstallationTable = () => {
  const validateSomewhat = makeValidateProperties(
    harden(['installation', 'bundle']),
  );
  return makeTable(validateSomewhat);
};

// Instance Table
// Columns: handle | installationHandle | publicAPI | terms |
// issuerKeywordRecord | brandKeywordRecord
const makeInstanceTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden([
      'installationHandle',
      'publicAPI',
      'terms',
      'issuerKeywordRecord',
      'brandKeywordRecord',
    ]),
  );

  return makeTable(validateSomewhat);
};

// Offer Table
// Columns:
//   handle | instanceHandle | proposal | currentAllocation, notifier, updater
const makeOfferTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateProperties = makeValidateProperties(
    harden([
      'instanceHandle',
      'proposal',
      'currentAllocation',
      'notifier',
      'updater',
    ]),
  );
  const validateSomewhat = obj => {
    validateProperties(obj);
    // TODO: Should check the rest of the representation of the proposal
    // TODO: Should check that the deadline representation is itself valid.
    return true;
  };

  const makeCustomMethods = table => {
    const customMethods = harden({
      getOffers: offerHandles => offerHandles.map(table.get),
      getOfferStatuses: offerHandles => {
        const active = [];
        const inactive = [];
        for (const offerHandle of offerHandles) {
          if (table.has(offerHandle)) {
            active.push(offerHandle);
          } else {
            inactive.push(offerHandle);
          }
        }
        return harden({
          active,
          inactive,
        });
      },
      isOfferActive: offerHandle => table.has(offerHandle),
      deleteOffers: offerHandles => {
        return offerHandles.map(offerHandle => {
          const { updater } = table.get(offerHandle);
          updater.resolve(undefined);
          return table.delete(offerHandle);
        });
      },
      updateAmounts: (offerHandles, newAllocations) =>
        offerHandles.map((offerHandle, i) => {
          // newAllocation can replace the old allocation entirely
          const newAllocation = newAllocations[i];
          const { updater } = table.get(offerHandle);
          updater.updateState(newAllocation);
          return table.update(offerHandle, {
            currentAllocation: newAllocation,
          });
        }),
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, makeCustomMethods);
};

// Payout Map
/**
 * Create payoutMap
 * @returns {import('@agoric/store').Store<OfferHandle,
 * Promise<Payment>>} Store
 */
const makePayoutMap = () => makeStore('offerHandle');

// Issuer Table
// Columns: brand | issuer | purse | amountMath
//
// The IssuerTable is keyed by brand, but the Issuer is required in order for
// getPromiseForIssuerRecord() to initialize the records. When
// getPromiseForIssuerRecord is called and the record doesn't exist, it stores a
// promise for the record in issuersInProgress, and then builds the record. It
// updates the tables when done.
const makeIssuerTable = () => {
  // TODO: make sure this validate function protects against malicious
  //  misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden(['brand', 'issuer', 'purse', 'amountMath']),
  );

  const makeCustomMethods = table => {
    const issuersInProgress = makeStore();
    const issuerToBrand = makeStore();

    // We can't be sure we can build the table entry soon enough that the first
    // caller will get the actual data, so we start by saving a promise in the
    // inProgress table, and once we have the Issuer, build the record, fill in
    // the table, and resolve the promise.
    function buildTableEntryAndPlaceHolder(issuer) {
      // remote calls which immediately return a promise
      const mathHelpersNameP = E(issuer).getMathHelpersName();
      const brandP = E(issuer).getBrand();
      const purseP = E(issuer).makeEmptyPurse();

      // a promise for a synchronously accessible record
      const synchronousRecordP = Promise.all([
        brandP,
        mathHelpersNameP,
        purseP,
      ]).then(([brand, mathHelpersName, purse]) => {
        const amountMath = makeAmountMath(brand, mathHelpersName);
        const issuerRecord = {
          brand,
          issuer,
          purse,
          amountMath,
        };
        table.create(issuerRecord, brand);
        issuerToBrand.init(issuer, brand);
        issuersInProgress.delete(issuer);
        return table.get(brand);
      });
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
      getPromiseForIssuerRecords: issuerPs =>
        Promise.all(issuerPs.map(customMethods.getPromiseForIssuerRecord)),
      brandFromIssuer: issuer => issuerToBrand.get(issuer),
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, makeCustomMethods);
};

const makeTables = () =>
  harden({
    installationTable: makeInstallationTable(),
    instanceTable: makeInstanceTable(),
    offerTable: makeOfferTable(),
    payoutMap: makePayoutMap(),
    issuerTable: makeIssuerTable(),
  });

export { makeTables };
