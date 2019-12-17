import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';
import makePromise from '@agoric/ertp/util/makePromise';

import { makePrivateName } from '@agoric/ertp/util/PrivateName';
import { insist } from '@agoric/ertp/util/insist';
import { makeUnitOps } from '@agoric/ertp/core/unitOps';
import { extentOpsLib } from '@agoric/ertp/core/config/extentOpsLib';

const makeTable = (validateFn, makeCustomMethodsFn = () => {}) => {
  // The WeakMap that stores the records
  const handleToRecord = makePrivateName();

  const table = harden({
    validate: validateFn,
    create: (handle, record) => {
      record = harden({
        ...record,
        handle, // reliably add the handle to the record
      });
      table.validate(record);
      handleToRecord.init(handle, record);
      return record;
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
      return record;
    },
    // eslint-disable-next-line no-use-before-define
  });

  const customMethodsTable = harden({
    ...makeCustomMethodsFn(table),
    ...table,
  });
  return customMethodsTable;
};

const validateProperties = (expectedProperties, obj) => {
  // add handle to expected properties
  expectedProperties.push('handle');
  const actualProperties = Object.getOwnPropertyNames(obj);
  insist(
    actualProperties.length === expectedProperties.length,
  )`the actual properties (${actualProperties}) did not match the \
  expected properties (${expectedProperties})`;
  for (const prop of actualProperties) {
    insist(
      expectedProperties.includes(prop),
    )`property ${prop} was not expected`;
  }
  for (const prop of expectedProperties) {
    insist(
      actualProperties.includes(prop),
    )`property ${prop} was expected but not present`;
  }
  return true;
};

// Installation Table
// Columns: handle | installation
const makeInstallationTable = () => {
  const validate = obj => validateProperties(['installation'], obj);
  return makeTable(validate);
};

// Instance Table
// Columns: handle | installationHandle | instance | terms | assays
const makeInstanceTable = () => {
  const validate = obj =>
    validateProperties(
      ['installationHandle', 'instance', 'terms', 'assays'],
      obj,
    );
  return makeTable(validate);
};

// Offer Table
// Columns: handle | instanceHandle | assays | payoutRules | exitRule
// | units | extents
const makeOfferTable = () => {
  const insistValidPayoutRuleKinds = payoutRules => {
    const acceptedKinds = [
      'offerExactly',
      'offerAtMost',
      'wantExactly',
      'wantAtLeast',
    ];
    for (const payoutRule of payoutRules) {
      insist(
        acceptedKinds.includes(payoutRule.kind),
      )`${payoutRule.kind} must be one of the accepted kinds.`;
    }
  };
  const insistValidExitRule = exitRule => {
    const acceptedExitRuleKinds = [
      'noExit',
      'onDemand',
      'afterDeadline',
      // 'onDemandAfterDeadline', // not yet supported
    ];
    insist(
      acceptedExitRuleKinds.includes(exitRule.kind),
    )`exitRule.kind ${exitRule.kind} is not one of the accepted options`;
  };

  const validate = obj => {
    validateProperties(
      [
        'instanceHandle',
        'assays',
        'payoutRules',
        'exitRule',
        'units',
        'extents',
      ],
      obj,
    );
    insistValidPayoutRuleKinds(obj.payoutRules);
    insistValidExitRule(obj.exitRule);
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

      // For backwards-compatibility. To be deprecated in future PRs
      getPayoutRulesFor: offerHandles =>
        offerHandles.map(offerHandle => table.get(offerHandle).payoutRules),

      // For backwards-compatibility. To be deprecated in future PRs
      recordUsedInInstance: (offerHandle, instanceHandle) => {
        table.update(offerHandle, { instanceHandle });
      },

      // For backwards-compatibility. To be deprecated in future PRs
      getExtentsFor: offerHandles =>
        offerHandles.map(offerHandle => table.get(offerHandle).extents),

      // For backwards-compatibility. To be deprecated in future PRs
      updateExtents: (offerHandle, extents) => {
        table.update(offerHandle, { extents });
      },

      // For backwards-compatibility. To be deprecated in future PRs
      updateExtentMatrix: (offerHandles, newExtentMatrix) =>
        offerHandles.map((offerHandle, i) =>
          customMethods.updateExtents(offerHandle, newExtentMatrix[i]),
        ),
    });
    return customMethods;
  };

  return makeTable(validate, makeCustomMethods);
};

// Payout Map
// PrivateName: offerHandle | payoutPromise
const makePayoutMap = makePrivateName;

// Assay Table
// Columns: assay | purseP | unitOps | extentOps | label
// where the extentOps column is deprecated, to disappear shortly
const makeAssayTable = () => {
  const validate = obj =>
    validateProperties(
      ['assay', 'purseP', 'unitOps', 'extentOps', 'label'],
      obj,
    );

  const makeCustomMethods = table => {
    // maps from assay presences to assay promise/resolver pairs
    const assaysInProgress = makePrivateName();

    const customMethods = harden({
      getUnitOpsForAssays: assays =>
        assays.map(assay => table.get(assay).unitOps),

      getPursesForAssays: assays =>
        assays.map(assay => table.get(assay).purseP),

      // Given a promise for an assay, return a promise for that same assay
      // which only fulfills to the assay once it has been entered into the
      // assayTable.
      getReadyAssay: assayP => {
        Promise.resolve(assayP).then(assay => {
          if (table.has(assay)) {
            return assayP;
          }
          if (assaysInProgress.has(assay)) {
            return assaysInProgress.get(assay).p;
          }
          const pair = makePromise();
          assaysInProgress.init(assay, pair);

          const extentOpsDescP = E(assay).getExtentOps();
          const labelP = E(assay).getLabel();
          const purseP = E(assayP).makeEmptyPurse();

          Promise.all([labelP, extentOpsDescP]).then(
            ([label, { name, extentOpsArgs = [] }]) => {
              const makeExtentOps = extentOpsLib[name];
              const assayRecord = harden({
                assay,
                purseP,
                unitOps: makeUnitOps(label, name, extentOpsArgs),
                extentOps: makeExtentOps(...extentOpsArgs),
                label,
              });
              table.create(assay, assayRecord);
              assaysInProgress.get(assay).res(assay);
              assaysInProgress.delete(assay);
            },
          );
          return pair.p;
        });
      },

      getReadyAssays: assayPs => Promise.all(assayPs.map(table.getReadyAssay)),

      // For backwards-compatibility. To be deprecated in future PRs
      getExtentOpsForAssays: assays =>
        assays.map(assay => table.get(assay).extentOps),
      // For backwards-compatibility. To be deprecated in future PRs
      getLabelsForAssays: assays => assays.map(assay => table.get(assay).label),
    });
    return customMethods;
  };

  return makeTable(validate, makeCustomMethods);
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
