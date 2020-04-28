import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import makeStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import { makeTable, makeValidateProperties } from './table';

// Installation Table
// Columns: handle | installation | code
const makeInstallationTable = () => {
  const validateSomewhat = makeValidateProperties(
    harden(['installation', 'code']),
  );
  return makeTable(validateSomewhat);
};

// Instance Table
// Columns: handle | installationHandle | publicAPI | terms | issuerKeywordRecord
const makeInstanceTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden(['installationHandle', 'publicAPI', 'terms', 'issuerKeywordRecord']),
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
      updateAmounts: (offerHandles, newAmountKeywordRecords) =>
        offerHandles.map((offerHandle, i) => {
          // newAmountKeywordRecords may be based on sparse keywords,
          // so we don't want to replace the allocation entirely
          const newAmountKeywordRecord = newAmountKeywordRecords[i];
          const { updater, currentAllocation: pastAllocation } = table.get(
            offerHandle,
          );
          const currentAllocation = {
            ...pastAllocation,
            ...newAmountKeywordRecord,
          };
          updater.updateState(currentAllocation);
          return table.update(offerHandle, {
            currentAllocation,
          });
        }),
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, makeCustomMethods);
};

// Payout Map
// PrivateName: offerHandle | payoutPromise
const makePayoutMap = makeStore;

// Issuer Table
// Columns: issuer | brand | purse | amountMath
const makeIssuerTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden(['issuer', 'brand', 'purse', 'amountMath']),
  );

  const makeCustomMethods = table => {
    const issuersInProgress = makeStore();

    const customMethods = harden({
      getPurseKeywordRecord: issuerKeywordRecord => {
        const purseKeywordRecord = {};
        Object.keys(issuerKeywordRecord).forEach(keyword => {
          purseKeywordRecord[keyword] = table.get(
            issuerKeywordRecord[keyword],
          ).purse;
        });
        return harden(purseKeywordRecord);
      },

      // `issuerP` may be a promise, presence, or local object
      getPromiseForIssuerRecord: issuerP => {
        return Promise.resolve(issuerP).then(issuer => {
          if (!table.has(issuer)) {
            if (issuersInProgress.has(issuer)) {
              // a promise which resolves to the issuer record
              return issuersInProgress.get(issuer);
            }
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
                issuer,
                brand,
                purse,
                amountMath,
              };
              table.create(issuerRecord, issuer);
              issuersInProgress.delete(issuer);
              return table.get(issuer);
            });
            issuersInProgress.init(issuer, synchronousRecordP);
            return synchronousRecordP;
          }
          return table.get(issuer);
        });
      },
      getPromiseForIssuerRecords: issuerPs =>
        Promise.all(issuerPs.map(customMethods.getPromiseForIssuerRecord)),
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
