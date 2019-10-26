import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import { extentOpsLib } from '../../config/extentOpsLib';
import { makePrivateName } from '../../../util/PrivateName';

const makeState = () => {
  const offerHandleToExtents = makePrivateName();
  const offerHandleToAssays = makePrivateName();
  const offerHandleToOfferDesc = makePrivateName();
  const offerHandleToExitCondition = makePrivateName();
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
    getAssetDescOpsArrayForInstanceHandle: instanceHandle =>
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
    getAssetDescOpsArrayForAssays: assays =>
      assays.map(assay => assayToDescOps.get(assay)),
    getExtentOpsArrayForAssays: assays =>
      assays.map(assay => assayToExtentOps.get(assay)),
    getLabelsForAssays: assays => assays.map(assay => assayToLabel.get(assay)),

    // per offerHandles array
    getAssaysFor: offerHandles =>
      offerHandles.map(offerHandle => offerHandleToAssays.get(offerHandle)),
    getExtentsFor: offerHandles =>
      offerHandles.map(offerHandle => offerHandleToExtents.get(offerHandle)),
    getOfferDescsFor: offerHandles =>
      offerHandles.map(offerHandle => offerHandleToOfferDesc.get(offerHandle)),
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
      await Promise.all(assays.map(assay => adminState.recordAssay(assay)));
    },
    getInstance: instanceHandle => instanceHandleToInstance.get(instanceHandle),
    getInstallationHandleForInstanceHandle: instanceHandle =>
      instanceHandleToInstallationHandle.get(instanceHandle),
    getPurses: assays => assays.map(assay => assayToPurse.get(assay)),
    recordAssay: async assay => {
      if (!assayToPurse.has(assay)) {
        const assetDescOpsP = E(assay).getAssetDescOps();
        const labelP = E(assay).getLabel();
        const purseP = E(assay).makeEmptyPurse();
        const extentOpsDescP = E(assay).getExtentOps();

        const [assetDescOps, label, purse, extentOpsDesc] = await Promise.all([
          assetDescOpsP,
          labelP,
          purseP,
          extentOpsDescP,
        ]);

        assayToDescOps.init(assay, assetDescOps);
        assayToLabel.init(assay, label);
        assayToPurse.init(assay, purse);
        const { name, extentOpArgs = [] } = extentOpsDesc;
        assayToExtentOps.init(assay, extentOpsLib[name](...extentOpArgs));
      }
      return harden({
        assetDescOps: assayToDescOps.get(assay),
        label: assayToLabel.get(assay),
        purse: assayToPurse.get(assay),
        extentOps: assayToExtentOps.get(assay),
      });
    },
    recordOffer: (offerHandle, offerConditions, extents, assays, result) => {
      const { offerDesc, exit } = offerConditions;
      offerHandleToExtents.init(offerHandle, extents);
      offerHandleToAssays.init(offerHandle, assays);
      offerHandleToOfferDesc.init(offerHandle, offerDesc);
      offerHandleToExitCondition.init(offerHandle, exit);
      offerHandleToResult.init(offerHandle, result);
      activeOffers.add(offerHandle);
    },
    replaceResult: (offerHandle, newResult) => {
      offerHandleToResult.set(offerHandle, newResult);
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
        offerHandleToOfferDesc.delete(offerHandle);
        offerHandleToExitCondition.delete(offerHandle);
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
