import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import makeStore from '@agoric/weak-store';
import { assert, details } from '@agoric/assert';
import { makeUnitOps } from '@agoric/ertp/src/unitOps';

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
      expected properties (${expectedProperties})`);
    for (let i = 0; i < actualProperties.length; i += 1) {
      assert(
        expectedProperties[i] === actualProperties[i],
        details`property ${expectedProperties[i]} did not equal actual property ${actualProperties[i]}`);
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
// Columns: handle | installationHandle | publicAPI | terms | assays
const makeInstanceTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden(['installationHandle', 'publicAPI', 'terms', 'assays']),
  );
  return makeTable(validateSomewhat);
};

// Offer Table
// Columns: handle | instanceHandle | assays | payoutRules | exitRule
// | units
const makeOfferTable = () => {
  const insistValidPayoutRuleKinds = payoutRules => {
    const acceptedKinds = ['offerAtMost', 'wantAtLeast'];
    for (const payoutRule of payoutRules) {
      assert(
        acceptedKinds.includes(payoutRule.kind),
        details`${payoutRule.kind} must be one of the accepted kinds.`
      );
    }
  };
  const insistValidExitRule = exitRule => {
    const acceptedExitRuleKinds = [
      'waived',
      'onDemand',
      'afterDeadline',
      // 'onDemandAfterDeadline', // not yet supported
    ];
    assert(
      acceptedExitRuleKinds.includes(exitRule.kind),
      details`exitRule.kind ${exitRule.kind} is not one of the accepted options`
    );
  };

  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateProperties = makeValidateProperties(
    harden(['instanceHandle', 'assays', 'payoutRules', 'exitRule', 'units']),
  );
  const validateSomewhat = obj => {
    validateProperties(obj);
    insistValidPayoutRuleKinds(obj.payoutRules);
    insistValidExitRule(obj.exitRule);
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
      updateUnitMatrix: (offerHandles, newUnitMatrix) =>
        offerHandles.map((offerHandle, i) =>
          table.update(offerHandle, harden({ units: newUnitMatrix[i] })),
        ),
    });
    return customMethods;
  };

  return makeTable(validateSomewhat, makeCustomMethods);
};

// Payout Map
// PrivateName: offerHandle | payoutPromise
const makePayoutMap = makeStore;

// Assay Table
// Columns: assay | purse | unitOps
const makeAssayTable = () => {
  // TODO: make sure this validate function protects against malicious
  // misshapen objects rather than just a general check.
  const validateSomewhat = makeValidateProperties(
    harden(['assay', 'purse', 'unitOps']),
  );

  const makeCustomMethods = table => {
    const assaysInProgress = makeStore();

    const customMethods = harden({
      getUnitOpsForAssays: assays =>
        assays.map(assay => table.get(assay).unitOps),

      getPursesForAssays: assays => assays.map(assay => table.get(assay).purse),

      // `assayP` may be a promise, presence, or local object
      getPromiseForAssayRecord: assayP => {
        return Promise.resolve(assayP).then(assay => {
          if (!table.has(assay)) {
            if (assaysInProgress.has(assay)) {
              // a promise which resolves to the assay record
              return assaysInProgress.get(assay);
            }
            // remote calls which immediately return a promise
            const extentOpsDescP = E(assay).getExtentOps();
            const labelP = E(assay).getLabel();
            const purseP = E(assay).makeEmptyPurse();

            // a promise for a synchronously accessible record
            const synchronousRecordP = Promise.all([
              labelP,
              extentOpsDescP,
              purseP,
            ]).then(([label, { name, extentOpsArgs = [] }, purse]) => {
              const unitOps = makeUnitOps(label, name, extentOpsArgs);
              const assayRecord = {
                assay,
                purse,
                unitOps,
              };
              table.create(assayRecord, assay);
              assaysInProgress.delete(assay);
              return table.get(assay);
            });
            assaysInProgress.init(assay, synchronousRecordP);
            return synchronousRecordP;
          }
          return table.get(assay);
        });
      },
      getPromiseForAssayRecords: assayPs =>
        Promise.all(assayPs.map(customMethods.getPromiseForAssayRecord)),
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
    assayTable: makeAssayTable(),
  });

export { makeTables };
