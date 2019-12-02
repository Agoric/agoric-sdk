import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import { extentOpsLib } from '@agoric/ertp/core/config/extentOpsLib';
import { makePrivateName } from '@agoric/ertp/util/PrivateName';

const makeState = () => {
  const offerHandleToExtents = makePrivateName();
  const offerHandleToAssays = makePrivateName();
  const offerHandleToPayoutRules = makePrivateName();
  const offerHandleToExitRule = makePrivateName();
  const offerHandleToResult = makePrivateName();
  const offerHandleToInstanceHandle = makePrivateName();

  const activeOffers = new WeakSet();

  const instanceHandleToInstallationHandle = makePrivateName();
  const instanceHandleToInstance = makePrivateName();
  const instanceHandleToTerms = makePrivateName();
  const instanceHandleToAssays = makePrivateName();

  const assayToPurse = makePrivateName();
  const assayToExtentOps = makePrivateName();
  const assayToDescOps = makePrivateName();
  const assayToLabel = makePrivateName();

  const installationHandleToInstallation = makePrivateName();
  const installationToInstallationHandle = makePrivateName();

  const readOnlyState = harden({
    // per instanceHandle
    getTerms: instanceHandle => instanceHandleToTerms.get(instanceHandle),
    getAssays: instanceHandle => instanceHandleToAssays.get(instanceHandle),
    getUnitOpsArrayForInstanceHandle: instanceHandle =>
      readOnlyState
        .getAssays(instanceHandle)
        .map(assay => assayToDescOps.get(assay)),
    getExtentOpsArrayForInstanceHandle: instanceHandle =>
      readOnlyState
        .getAssays(instanceHandle)
        .map(assay => assayToExtentOps.get(assay)),
    getLabelsForInstanceHandle: instanceHandle =>
      readOnlyState
        .getAssays(instanceHandle)
        .map(assay => assayToLabel.get(assay)),

    // per assays array (this can be used before an offer is
    // associated with an instance)
    getUnitOpsArrayForAssays: assays =>
      assays.map(assay => assayToDescOps.get(assay)),
    getExtentOpsArrayForAssays: assays =>
      assays.map(assay => assayToExtentOps.get(assay)),
    getLabelsForAssays: assays => assays.map(assay => assayToLabel.get(assay)),

    // per offerHandles array
    getAssaysFor: offerHandles =>
      offerHandles.map(offerHandle => offerHandleToAssays.get(offerHandle)),
    getExtentsFor: offerHandles =>
      offerHandles.map(offerHandle => offerHandleToExtents.get(offerHandle)),
    getPayoutRulesFor: offerHandles =>
      offerHandles.map(offerHandle =>
        offerHandleToPayoutRules.get(offerHandle),
      ),
    getStatusFor: offerHandles => {
      const active = [];
      const inactive = [];
      for (const offerHandle of offerHandles) {
        if (activeOffers.has(offerHandle)) {
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
  });

  // The adminState should never leave Zoe and should be closely held
  const adminState = harden({
    addInstallation: installation => {
      const installationHandle = harden({});
      installationToInstallationHandle.init(installation, installationHandle);
      installationHandleToInstallation.init(installationHandle, installation);
      return installationHandle;
    },
    getInstallation: installationHandle =>
      installationHandleToInstallation.get(installationHandle),
    addInstance: async (
      instanceHandle,
      instance,
      installationHandle,
      terms,
      assays,
    ) => {
      instanceHandleToInstance.init(instanceHandle, instance);
      instanceHandleToInstallationHandle.init(
        instanceHandle,
        installationHandle,
      );
      instanceHandleToTerms.init(instanceHandle, terms);
      instanceHandleToAssays.init(instanceHandle, assays);
      for (let i = 0; i < assays.length; i += 1) {
        // we want to wait until the first call returns before moving
        // onto the next in case it is a duplicate assay
        // eslint-disable-next-line no-await-in-loop
        await adminState.recordAssay(assays[i]);
      }
    },
    getInstance: instanceHandle => instanceHandleToInstance.get(instanceHandle),
    getInstallationHandleForInstanceHandle: instanceHandle =>
      instanceHandleToInstallationHandle.get(instanceHandle),
    getPurses: assays => assays.map(assay => assayToPurse.get(assay)),
    recordAssay: async assay => {
      if (!assayToPurse.has(assay)) {
        const unitOpsP = E(assay).getUnitOps();
        const labelP = E(assay).getLabel();
        const purseP = E(assay).makeEmptyPurse();
        const extentOpsDescP = E(assay).getExtentOps();

        const [unitOps, label, purse, extentOpsDesc] = await Promise.all([
          unitOpsP,
          labelP,
          purseP,
          extentOpsDescP,
        ]);

        assayToDescOps.init(assay, unitOps);
        assayToLabel.init(assay, label);
        assayToPurse.init(assay, purse);
        const { name, extentOpArgs = [] } = extentOpsDesc;
        assayToExtentOps.init(assay, extentOpsLib[name](...extentOpArgs));
      }
      return harden({
        unitOps: assayToDescOps.get(assay),
        label: assayToLabel.get(assay),
        purse: assayToPurse.get(assay),
        extentOps: assayToExtentOps.get(assay),
      });
    },
    recordOffer: (offerHandle, offerRules, extents, assays, result) => {
      const { payoutRules, exit } = offerRules;
      offerHandleToExtents.init(offerHandle, extents);
      offerHandleToAssays.init(offerHandle, assays);
      offerHandleToPayoutRules.init(offerHandle, payoutRules);
      offerHandleToExitRule.init(offerHandle, exit);
      offerHandleToResult.init(offerHandle, result);
      activeOffers.add(offerHandle);
    },
    recordUsedInInstance: (instanceHandle, offerHandle) =>
      offerHandleToInstanceHandle.init(offerHandle, instanceHandle),
    getInstanceHandleForOfferHandle: offerHandle => {
      if (offerHandleToInstanceHandle.has(offerHandle)) {
        return offerHandleToInstanceHandle.get(offerHandle);
      }
      return undefined;
    },
    setExtentsFor: (offerHandles, reallocation) =>
      offerHandles.map((offerHandle, i) =>
        offerHandleToExtents.set(offerHandle, reallocation[i]),
      ),
    getResultsFor: offerHandles =>
      offerHandles.map(offerHandle => offerHandleToResult.get(offerHandle)),
    removeOffers: offerHandles => {
      // has-side-effects
      // eslint-disable-next-line array-callback-return
      offerHandles.map(offerHandle => {
        offerHandleToExtents.delete(offerHandle);
        offerHandleToAssays.delete(offerHandle);
        offerHandleToPayoutRules.delete(offerHandle);
        offerHandleToExitRule.delete(offerHandle);
        offerHandleToResult.delete(offerHandle);
        if (offerHandleToInstanceHandle.has(offerHandle)) {
          offerHandleToInstanceHandle.delete(offerHandle);
        }
      });
    },
    setOffersAsInactive: offerHandles => {
      offerHandles.map(offerHandle => activeOffers.delete(offerHandle));
    },
  });
  return {
    adminState,
    readOnlyState,
  };
};

export { makeState };
