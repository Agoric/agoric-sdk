import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import { extentOpsLib } from '../../config/extentOpsLib';
import { makePrivateName } from '../../../util/PrivateName';

const makeState = () => {
  const offerIdToExtents = makePrivateName();
  const offerIdToAssays = makePrivateName();
  const offerIdToOfferDesc = makePrivateName();
  const offerIdToExitCondition = makePrivateName();
  const offerIdToResult = makePrivateName();
  const offerIdToInstanceId = makePrivateName();

  const activeOffers = new WeakSet();

  const instanceIdToInstallationId = new WeakMap();
  const instanceIdToInstance = new WeakMap();
  const instanceIdToArgs = new WeakMap();
  const instanceIdToAssays = new WeakMap();

  const assayToPurse = new WeakMap();
  const assayToExtentOps = new WeakMap();
  const assayToDescOps = new WeakMap();
  const assayToLabel = new WeakMap();

  const installationIdToInstallation = new WeakMap();
  const installationToInstallationId = new WeakMap();

  const readOnlyState = harden({
    // per instance id
    getArgs: instanceId => instanceIdToArgs.get(instanceId),
    getAssays: instanceId => instanceIdToAssays.get(instanceId),

    // per instanceId
    getDescOpsArrayForInstanceId: instanceId =>
      readOnlyState
        .getAssays(instanceId)
        .map(assay => assayToDescOps.get(assay)),
    getExtentOpsArrayForInstanceId: instanceId =>
      readOnlyState
        .getAssays(instanceId)
        .map(assay => assayToExtentOps.get(assay)),
    getLabelsForInstanceId: instanceId =>
      readOnlyState.getAssays(instanceId).map(assay => assayToLabel.get(assay)),

    // per assays array (this can be used before an offer is
    // associated with an instance)
    getDescOpsArrayForAssays: assays =>
      assays.map(assay => assayToDescOps.get(assay)),
    getExtentOpsArrayForAssays: assays =>
      assays.map(assay => assayToExtentOps.get(assay)),
    getLabelsForAssays: assays => assays.map(assay => assayToLabel.get(assay)),

    // per offerIds array
    getAssaysFor: offerIds =>
      offerIds.map(offerId => offerIdToAssays.get(offerId)),
    getExtentsFor: offerIds =>
      offerIds.map(offerId => offerIdToExtents.get(offerId)),
    getOfferDescsFor: offerIds =>
      offerIds.map(offerId => offerIdToOfferDesc.get(offerId)),
    getStatusFor: offerIds => {
      const active = [];
      const inactive = [];
      for (const offerId of offerIds) {
        if (activeOffers.has(offerId)) {
          active.push(offerId);
        } else {
          inactive.push(offerId);
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
      const installationId = harden({});
      installationToInstallationId.set(installation, installationId);
      installationIdToInstallation.set(installationId, installation);
      return installationId;
    },
    getInstallation: installationId =>
      installationIdToInstallation.get(installationId),
    recordAssaysForInstance: async (instanceId, assays) => {
      instanceIdToAssays.set(instanceId, assays);
      await Promise.all(
        assays.map(async assay => adminState.recordAssay(assay)),
      );
    },
    addInstance: (instanceId, instance, installationId, args) => {
      instanceIdToInstance.set(instanceId, instance);
      instanceIdToInstallationId.set(instanceId, installationId);
      instanceIdToArgs.set(instanceId, args);
    },
    getInstance: instanceId => instanceIdToInstance.get(instanceId),
    getInstallationIdForInstanceId: instanceId =>
      instanceIdToInstallationId.get(instanceId),
    getPurses: assays => assays.map(assay => assayToPurse.get(assay)),
    recordAssay: async assay => {
      if (!assayToPurse.has(assay)) {
        assayToDescOps.set(assay, await E(assay).getDescOps());
        assayToLabel.set(assay, await E(assay).getLabel());
        assayToPurse.set(assay, await E(assay).makeEmptyPurse());
        const { name, extentOpArgs = [] } = await E(assay).getExtentOps();
        assayToExtentOps.set(assay, extentOpsLib[name](...extentOpArgs));
      }

      return harden({
        descOps: assayToDescOps.get(assay),
        label: assayToLabel.get(assay),
        purse: assayToPurse.get(assay),
        extentOps: assayToExtentOps.get(assay),
      });
    },
    recordOffer: (offerId, conditions, extents, assays, result) => {
      const { offerDesc, exit } = conditions;
      offerIdToExtents.init(offerId, extents);
      offerIdToAssays.init(offerId, assays);
      offerIdToOfferDesc.init(offerId, offerDesc);
      offerIdToExitCondition.init(offerId, exit);
      offerIdToResult.init(offerId, result);
      activeOffers.add(offerId);
    },
    replaceResult: (offerId, newResult) => {
      offerIdToResult.set(offerId, newResult);
    },
    recordUsedInInstance: (instanceId, offerId) =>
      offerIdToInstanceId.init(offerId, instanceId),
    getInstanceIdForOfferId: offerId => {
      if (offerIdToInstanceId.has(offerId)) {
        return offerIdToInstanceId.get(offerId);
      }
      return undefined;
    },
    setExtentsFor: (offerIds, reallocation) =>
      offerIds.map((offerId, i) =>
        offerIdToExtents.set(offerId, reallocation[i]),
      ),
    getResultsFor: offerIds =>
      offerIds.map(objId => offerIdToResult.get(objId)),
    removeOffers: offerIds => {
      // has-side-effects
      // eslint-disable-next-line array-callback-return
      offerIds.map(objId => {
        offerIdToExtents.delete(objId);
        offerIdToAssays.delete(objId);
        offerIdToOfferDesc.delete(objId);
        offerIdToExitCondition.delete(objId);
        offerIdToResult.delete(objId);
        if (offerIdToInstanceId.has(objId)) {
          offerIdToInstanceId.delete(objId);
        }
      });
    },
    setOffersAsInactive: offerIds => {
      offerIds.map(offerId => activeOffers.delete(offerId));
    },
  });
  return {
    adminState,
    readOnlyState,
  };
};

export { makeState };
