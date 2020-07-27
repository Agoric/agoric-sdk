// @ts-check

import { E } from '@agoric/eventual-send';

import makeWeakStore from '@agoric/weak-store';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import { makeTable, makeValidateProperties } from './table';

import '../exported';
import './internal-types';

export { makeHandle } from './table';

// Installation Table key: installationHandle
// Columns: bundle
/**
 *
 */
const makeInstallationTable = () => {
  /**
   * @type {Validator<InstallationRecord>}
   */
  const validateSomewhat = makeValidateProperties(['bundle']);
  return makeTable(validateSomewhat, 'installationHandle');
};

// Instance Table key: instanceHandle
// Columns: installationHandle | publicAPI | terms | issuerKeywordRecord
//  | brandKeywordRecord | zcfForZoe | offerHandles
// Zoe uses this table to track contract instances. The issuerKeywordRecord and
// brandKeyword are slightly redundant, but are each convenient at this point.
// zcfForZoe provides a direct channel to the ZCF running in a vat. zcfForZoe
// is initially set to a promise, since it can't be created until a reply is
// received from the newly created vat. Zoe needs to know the offerHandles in
// order to fulfill its responsibility for exit safety.
const makeInstanceTable = () => {
  /**
   * TODO: make sure this validate function protects against malicious
   * misshapen objects rather than just a general check.
   *
   * @type {Validator<InstanceRecord & PrivateInstanceRecord>}
   */
  const validateSomewhat = makeValidateProperties([
    'installationHandle',
    'publicAPI',
    'terms',
    'issuerKeywordRecord',
    'brandKeywordRecord',
    'zcfForZoe',
    'offerHandles',
  ]);

  const makeCustomMethods = table => {
    const customMethods = harden({
      addOffer: (instanceHandle, newOfferHandle) => {
        const { offerHandles } = table.get(instanceHandle);
        offerHandles.add(newOfferHandle);
        return instanceHandle;
      },
      removeCompletedOffers: (instanceHandle, handlesToDrop) => {
        const { offerHandles } = table.get(instanceHandle);
        for (const h of handlesToDrop) {
          offerHandles.delete(h);
        }
        return instanceHandle;
      },
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, 'instanceHandle', makeCustomMethods);
};

// Offer Table key: offerHandle
// Columns: instanceHandle | proposal | currentAllocation | notifier | updater
// The two versions of this table are slightly different. Zoe's
// currentAllocation is kept up-to-date with ZCF and will be used for closing.
// Zcf effectively has a local cache of the allocations. Zoe's allocations are
// definitive (in comparison to the ones in zcf), so Zoe's notifier is
// authoritative. Zcf doesn't store a notifier, but does store a no-action
// updater, so updateAmounts can work polymorphically.
const makeOfferTable = () => {
  /**
   * TODO: make sure this validate function protects against malicious
   * misshapen objects rather than just a general check.
   */
  const validateProperties = makeValidateProperties(
    harden([
      'instanceHandle',
      'proposal',
      'currentAllocation',
      'notifier',
      'updater',
    ]),
  );

  /**
   * @type {Validator<OfferRecord & PrivateOfferRecord>}
   */
  const validateSomewhat = obj => {
    validateProperties(obj);
    // TODO: Should check the rest of the representation of the proposal
    // TODO: Should check that the deadline representation is itself valid.
    return true;
  };

  /**
   * @param {Table<OfferRecord & PrivateOfferRecord>} table
   */
  const makeCustomMethods = table => {
    const customMethods = harden({
      /** @param {OfferHandle[]} offerHandles */
      getOffers: offerHandles => offerHandles.map(table.get),
      /** @param {OfferHandle[]} offerHandles */
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
      /** @param {OfferHandle} offerHandle */
      isOfferActive: offerHandle => table.has(offerHandle),
      /** @param {OfferHandle[]} offerHandles */
      deleteOffers: offerHandles => {
        return offerHandles.map(offerHandle => {
          const { updater } = table.get(offerHandle);
          updater.finish(undefined);
          return table.delete(offerHandle);
        });
      },
      /**
       * @param {OfferHandle[]} offerHandles
       * @param {Allocation[]} newAllocations
       * @returns {OfferHandle[]}
       */
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

  return makeTable(validateSomewhat, 'offerHandle', makeCustomMethods);
};

// Payout Map key: offerHandle
// Columns: payout
/**
 * Create payoutMap
 * @returns {WeakStore<OfferHandle,PromiseRecord<PaymentPKeywordRecord>>} Store
 */
const makePayoutMap = () => makeWeakStore('offerHandle');

// Issuer Table key: brand
// Columns: issuer | purse | amountMath
//
// The IssuerTable is keyed by brand, but the Issuer is required in order for
// getPromiseForIssuerRecord() to initialize the records. When
// getPromiseForIssuerRecord is called and the record doesn't exist, it stores a
// promise for the record in issuersInProgress, and then builds the record. It
// updates the tables when done.
//
// Zoe main has an issuerTable that stores the purses with deposited assets.
// Zoe contract facet has everything but the purses.
const makeIssuerTable = (withPurses = true) => {
  /**
   * TODO: make sure this validate function protects against malicious
   * misshapen objects rather than just a general check.
   * @type {Validator<IssuerRecord & PrivateIssuerRecord>}
   */
  const validateSomewhat = makeValidateProperties(
    withPurses
      ? ['brand', 'issuer', 'purse', 'amountMath']
      : ['brand', 'issuer', 'amountMath'],
  );

  const makeCustomMethods = table => {
    /** @type {WeakStore<Issuer,any>} */
    const issuersInProgress = makeWeakStore('issuer');

    /** @type {WeakStore<Issuer,Brand>} */
    const issuerToBrand = makeWeakStore('issuer');

    // We can't be sure we can build the table entry soon enough that the first
    // caller will get the actual data, so we start by saving a promise in the
    // inProgress table, and once we have the Issuer, build the record, fill in
    // the table, and resolve the promise.
    /**
     * @param {Issuer} issuer
     */
    function buildTableEntryAndPlaceHolder(issuer) {
      // remote calls which immediately return a promise
      const mathHelpersNameP = E(issuer).getMathHelpersName();
      const brandP = E(issuer).getBrand();

      /**
       * a promise for a synchronously accessible record
       * @type {[PromiseLike<Brand>, PromiseLike<MathHelpersName>, PromiseLike<Purse> | undefined]}
       */
      const promiseRecord = [brandP, mathHelpersNameP, undefined];
      if (withPurses) {
        promiseRecord[2] = E(issuer).makeEmptyPurse();
      }
      const synchronousRecordP = Promise.all(promiseRecord).then(
        ([brand, mathHelpersName, purse]) => {
          const amountMath = makeAmountMath(brand, mathHelpersName);
          const issuerRecord = {
            brand,
            issuer,
            amountMath,
          };
          if (withPurses) {
            issuerRecord.purse = purse;
          }
          table.create(issuerRecord, brand);
          issuerToBrand.init(issuer, brand);
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
      /** @type {(issuerPs: (Issuer|PromiseLike<Issuer>)[]) => Promise<IssuerRecord[]>} */
      getPromiseForIssuerRecords: issuerPs =>
        Promise.all(issuerPs.map(customMethods.getPromiseForIssuerRecord)),
      brandFromIssuer: issuer => issuerToBrand.get(issuer),
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, 'brand', makeCustomMethods);
};

const makeZoeTables = () =>
  harden({
    installationTable: makeInstallationTable(),
    instanceTable: makeInstanceTable(),
    offerTable: makeOfferTable(),
    payoutMap: makePayoutMap(),
    issuerTable: makeIssuerTable(),
  });

const makeContractTables = () =>
  harden({
    offerTable: makeOfferTable(),
    issuerTable: makeIssuerTable(false),
  });

export { makeZoeTables, makeContractTables };
