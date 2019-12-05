import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import { makePrivateName } from '@agoric/ertp/util/PrivateName';
import { insist } from '@agoric/ertp/util/insist';
import { makeUnitOps } from '@agoric/ertp/core/unitOps';
import { extentOpsLib } from '@agoric/ertp/core/config/extentOpsLib';

// Installation Table
// Columns: installationHandle | installation
const makeInstallationTable = () => {
  // The WeakMap that stores the records
  const handleToRecord = makePrivateName();

  const installationTable = harden({
    // TODO validate installation record (use insist to throw)
    validate: _allegedInstallationRecord => true,
    create: (installationHandle, installationRecord) => {
      installationTable.validate(installationRecord);
      const newInstallationRecord = harden({
        ...installationRecord,
        installationHandle,
      });
      handleToRecord.init(installationHandle, newInstallationRecord);

      // TODO: decide whether this is the correct way to go
      // We do not return the whole record here, but only return the
      // installationHandle
      return installationHandle;
    },
    get: handleToRecord.get,
    has: handleToRecord.has,
  });

  return installationTable;
};

// Instance Table
// Columns: instanceHandle | installationHandle | instance | terms | assays
const makeInstanceTable = () => {
  // The WeakMap that stores the records
  const handleToRecord = makePrivateName();

  const instanceTable = harden({
    // TODO validate instance record (use insist to throw)
    validate: _allegedInstanceRecord => true,
    create: (instanceHandle, instanceRecord) => {
      instanceTable.validate(instanceRecord);
      const newInstanceRecord = harden({
        ...instanceRecord,
        instanceHandle,
      });
      handleToRecord.init(instanceHandle, newInstanceRecord);
      return handleToRecord.get(instanceHandle);
    },
    get: handleToRecord.get,
    has: handleToRecord.has,

    // Custom methods below. //
    getAssays: instanceHandle => handleToRecord.get(instanceHandle).assays,
  });

  return instanceTable;
};

// Offer Table
// Columns: offerHandle | instanceHandle | assays | exitRule | payoutPromise
const makeOfferTable = () => {
  // The WeakMap that stores the records
  const handleToRecord = makePrivateName();

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

  const offerTable = harden({
    // TODO validate offer record
    validate: allegedOfferRecord => {
      insistValidPayoutRuleKinds(allegedOfferRecord.payoutRules);
      insistValidExitRule(allegedOfferRecord.exitRule);
      return true;
    },
    create: (offerHandle, offerRecord) => {
      offerTable.validate(offerRecord);
      // Currently we do not harden this so we can change the units
      // associated with an offer.
      // TODO: handle units separately
      const newOfferRecord = {
        ...offerRecord,
        offerHandle,
      };
      handleToRecord.init(offerHandle, newOfferRecord);
      return handleToRecord.get(offerHandle);
    },
    get: handleToRecord.get,
    has: handleToRecord.has,
    delete: handleToRecord.delete,

    // Custom methods below. //
    createUnits: (offerHandle, units) => {
      const offerRecord = handleToRecord.get(offerHandle);
      insist(
        offerRecord.units === undefined,
      )`units must be undefined to be created`;
      offerRecord.units = units;
    },
    updateUnits: (offerHandle, units) => {
      const offerRecord = handleToRecord.get(offerHandle);
      offerRecord.units = units;
    },
    getPayoutRuleMatrix: (offerHandles, _assays) => {
      // Currently, we assume that all of the payoutRules for these
      // offerHandles are in the same order as the `assays` array. In
      // the future, we want to be able to use the offerHandle and assay
      // to select the payoutRule. Note that there may be more than one
      // payoutRule per offerHandle and assay, so (offerHandle, assay)
      // is not unique and cannot be used as a key.
      return offerHandles.map(
        offerHandle => offerTable.get(offerHandle).payoutRules,
      );
    },
    getPayoutRules: offerHandle => offerTable.get(offerHandle).payoutRules,
    getExitRule: offerHandle => offerTable.get(offerHandle).exitRule,
    getUnitMatrix: (offerHandles, _assays) =>
      // Currently, we assume that all of the units for these
      // offerHandles are in the same order as the `assays` array. In
      // the future, we want to be able to use the offerHandle and assay
      // to select the unit. Note that there may be more than one
      // payoutRule per offerHandle and assay, so (offerHandle, assay)
      // is not unique and cannot be used as a key.
      offerHandles.map(offerHandle => offerTable.get(offerHandle).units),
    updateUnitMatrix: (offerHandles, _assays, newUnitMatrix) =>
      // Currently, we assume that all of the units for these
      // offerHandles are in the same order as the `assays` array. In
      // the future, we want to be able to use the offerHandle and assay
      // to select the unit. Note that there may be more than one
      // unit per offerHandle and assay, so (offerHandle, assay)
      // is not unique and cannot be used as a key.
      offerHandles.map((offerHandle, i) =>
        offerTable.updateUnits(offerHandle, newUnitMatrix[i]),
      ),
    getOfferStatuses: offerHandles => {
      const active = [];
      const inactive = [];
      for (const offerHandle of offerHandles) {
        if (handleToRecord.has(offerHandle)) {
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
    isOfferActive: offerHandle => handleToRecord.has(offerHandle),
    getPayoutPromises: offerHandles =>
      offerHandles.map(
        offerHandle => offerTable.get(offerHandle).payoutPromise,
      ),
    deleteOffers: offerHandles =>
      offerHandles.map(offerHandle => offerTable.delete(offerHandle)),
    // For backwards-compatibility. To be deprecated in future PRs
    recordUsedInInstance: (offerHandle, instanceHandle) => {
      const offerRecord = handleToRecord.get(offerHandle);
      offerRecord.instanceHandle = instanceHandle;
    },
    // backwards compatibility
    getExtentsFor: offerHandles =>
      offerHandles.map(offerHandle => offerTable.get(offerHandle).extents),
    // backwards compatibility
    createExtents: (offerHandle, extents) => {
      const offerRecord = handleToRecord.get(offerHandle);
      offerRecord.extents = extents;
    },
    // backwards compatibility
    getExtentMatrix: (offerHandles, _assays) =>
      offerHandles.map(offerHandle => offerTable.get(offerHandle).extents),
    updateExtents: (offerHandle, extents) => {
      const offerRecord = handleToRecord.get(offerHandle);
      offerRecord.extents = extents;
    },
    updateExtentMatrix: (offerHandles, _assays, newExtentMatrix) =>
      offerHandles.map((offerHandle, i) =>
        offerTable.updateExtents(offerHandle, newExtentMatrix[i]),
      ),
  });

  return offerTable;
};

// Assay Table
// Columns: assay | purse | unitOps | label
const makeAssayTable = () => {
  // The WeakMap that stores the records
  const handleToRecord = makePrivateName();

  const assayTable = harden({
    // TODO validate assay record (use insist to throw)
    validate: _allegedAssayRecord => true,
    create: (assay, assayRecord) => {
      assayTable.validate(assayRecord);
      // TODO: How can we harden this?
      const newAssayRecord = {
        ...assayRecord,
        assay,
      };
      handleToRecord.init(assay, newAssayRecord);
      return handleToRecord.get(assay);
    },
    get: handleToRecord.get,
    has: handleToRecord.has,
    update: handleToRecord.set,

    // custom
    getUnitOpsForAssays: assays =>
      assays.map(assay => assayTable.get(assay).unitOps),

    getLabelsForAssays: assays =>
      assays.map(assay => assayTable.get(assay).label),

    getPursesForAssays: assays =>
      assays.map(assay => assayTable.get(assay).purseP),

    getOrCreateAssay: assay => {
      const setUnitOpsForAssay = unitOps => {
        const updatedAssayRecord = assayTable.get(assay);
        updatedAssayRecord.unitOps = unitOps;
        assayTable.update(assay, updatedAssayRecord);
      };

      // backwards-compatibility
      const setExtentOpsForAssay = extentOps => {
        const updatedAssayRecord = assayTable.get(assay);
        updatedAssayRecord.extentOps = extentOps;
        assayTable.update(assay, updatedAssayRecord);
      };

      const setLabelForAssay = label => {
        const updatedAssayRecord = assayTable.get(assay);
        updatedAssayRecord.label = label;
        assayTable.update(assay, updatedAssayRecord);
      };

      if (!assayTable.has(assay)) {
        const extentOpsDescP = E(assay).getExtentOps();
        const labelP = E(assay).getLabel();
        const assayRecord = {
          assay,
          purseP: E(assay).makeEmptyPurse(),
          labelP,
          unitOpsP: Promise.all([labelP, extentOpsDescP]).then(
            ([label, { name, extentOpsArgs = [] }]) => {
              const unitOps = makeUnitOps(label, name, extentOpsArgs);
              const makeExtentOps = extentOpsLib[name];
              const extentOps = makeExtentOps(...extentOpsArgs);
              setUnitOpsForAssay(unitOps);
              // backwards-compatibility
              setExtentOpsForAssay(extentOps);
              setLabelForAssay(label);
              return unitOps;
            },
          ),
        };
        return assayTable.create(assay, assayRecord);
      }
      return assayTable.get(assay);
    },
    // backwards compatibility
    getExtentOpsForAssays: assays =>
      assays.map(assay => assayTable.get(assay).extentOps),
  });

  return assayTable;
};

const makeTables = () =>
  harden({
    installationTable: makeInstallationTable(),
    instanceTable: makeInstanceTable(),
    offerTable: makeOfferTable(),
    assayTable: makeAssayTable(),
  });

export { makeTables };
