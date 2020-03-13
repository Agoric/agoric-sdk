import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import makeStore from '@agoric/weak-store';
import { assert, details } from '@agoric/assert';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import { sameStructure } from '@agoric/same-structure';

const makeTable = (validateFn, makeCustomMethodsFn = () => undefined) => {
  // The WeakMap that stores the records
  const handleToRecord = makeStore();

  const table = harden({
    validate: validateFn,
    create: (record, handle = harden({})) => {
      record = harden({
        ...record,
        handle, // reliably add the handle to the record
      });
      table.validate(record);
      handleToRecord.init(handle, record);
      return handle;
    },
    get: handleToRecord.get,
    has: handleToRecord.has,
    delete: handleToRecord.delete,
    update: (handle, partialRecord) => {
      const record = handleToRecord.get(handle);
      const updatedRecord = harden({
        ...record,
        ...partialRecord,
      });
      table.validate(updatedRecord);
      handleToRecord.set(handle, updatedRecord);
      return handle;
    },
  });

  const customMethodsTable = harden({
    ...makeCustomMethodsFn(table),
    ...table,
  });
  return customMethodsTable;
};

const makeValidateProperties = ([...expectedProperties]) => {
  // add handle to expected properties
  expectedProperties.push('handle');
  // Sorts in-place
  expectedProperties.sort();
  harden(expectedProperties);
  return obj => {
    const actualProperties = Object.getOwnPropertyNames(obj);
    actualProperties.sort();
    assert(
      actualProperties.length === expectedProperties.length,
      details`the actual properties (${actualProperties}) did not match the \
      expected properties (${expectedProperties})`,
    );
    for (let i = 0; i < actualProperties.length; i += 1) {
      assert(
        expectedProperties[i] === actualProperties[i],
        details`property ${expectedProperties[i]} did not equal actual property ${actualProperties[i]}`,
      );
    }
    return true;
  };
};

// Installation Table
// Columns: handle | installation
const makeInstallationTable = () => {
  const validateSomewhat = makeValidateProperties(harden(['installation']));
  return makeTable(validateSomewhat);
};

// Instance Table
// Columns: handle | installationHandle | publicAPI | terms | issuers
// | roles | roleNames
const makeInstanceTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden([
      'installationHandle',
      'publicAPI',
      'terms',
      'issuers',
      'roles',
      'roleNames',
    ]),
  );

  return makeTable(validateSomewhat);
};

// Offer Table
// Columns: handle | instanceHandle | issuers | offerRules
// | amounts
const makeOfferTable = () => {
  const insistValidKeys = offerRules => {
    const validKeys = harden(['want', 'offer', 'exit']);
    const keys = harden(Object.getOwnPropertyNames(offerRules));
    assert(
      sameStructure(keys, validKeys),
      details`offerRules must have valid keys`,
    );
  };
  const insistValidExitRule = exit => {
    const [exitRuleKind] = Object.getOwnPropertyNames(exit);
    const acceptedExitRuleKinds = [
      'waived',
      'onDemand',
      'afterDeadline',
      // 'onDemandAfterDeadline', // not yet supported
    ];
    assert(
      acceptedExitRuleKinds.includes(exitRuleKind),
      details`exitRuleKind ${exitRuleKind} is not one of the accepted options`,
    );
  };

  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateProperties = makeValidateProperties(
    harden(['instanceHandle', 'issuers', 'offerRules', 'amounts']),
  );
  const validateSomewhat = obj => {
    validateProperties(obj);
    insistValidKeys(obj.offerRules);
    insistValidExitRule(obj.offerRules.exit);
    // TODO: Should check the rest of the representation of the payout rule
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
      deleteOffers: offerHandles =>
        offerHandles.map(offerHandle => table.delete(offerHandle)),
      updateAmounts: (offerHandles, newAmountObjs) =>
        offerHandles.map((offerHandle, i) =>
          table.update(offerHandle, { amounts: newAmountObjs[i] }),
        ),
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, makeCustomMethods);
};

// Payout Map
// PrivateName: offerHandle | payoutPromise
const makePayoutMap = makeStore;

// Issuer Table
// Columns: issuer | brand| purse | amountMath
const makeIssuerTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden(['issuer', 'brand', 'purse', 'amountMath']),
  );

  const makeCustomMethods = table => {
    const issuersInProgress = makeStore();

    const customMethods = harden({
      getAmountMathsForRoles: roles => {
        const amountMaths = {};
        Object.entries(roles).map(
          ([roleName, issuer]) =>
            (amountMaths[roleName] = table.get(issuer).amountMath),
        );
        return harden(amountMaths);
      },
      getPursesForIssuers: issuers =>
        issuers.map(issuer => table.get(issuer).purse),

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
