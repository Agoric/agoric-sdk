import { assert } from '@endo/errors';
import { kser, kunser } from '@agoric/kmarshal';
import { insistVatID } from '../lib/id.js';

export function makeVatAdminHooks(tools) {
  const { kernelKeeper, terminateVat } = tools;
  return {
    createByBundle(argsCapData) {
      // first, split off vatParameters
      const args = kunser(argsCapData);
      const [bundle, { vatParameters, ...dynamicOptions }] = args;
      // assemble the vatParameters capdata
      const marshalledVatParameters = kser(vatParameters);
      // incref slots while create-vat is on run-queue
      for (const kref of marshalledVatParameters.slots) {
        kernelKeeper.incrementRefCount(kref, 'create-vat-event');
      }
      const source = { bundle };
      const vatID = kernelKeeper.allocateUnusedVatID();
      const event = {
        type: 'create-vat',
        vatID,
        source,
        vatParameters: marshalledVatParameters,
        dynamicOptions,
      };
      kernelKeeper.addToAcceptanceQueue(harden(event));
      // the device gets the new vatID immediately, and will be notified
      // later when it is created and a root object is available
      return harden(kser(vatID));
    },

    createByID(argsCapData) {
      // `argsCapData` is marshal([bundleID, options]), and `options` is {
      // vatParameters, ...rest }, and `rest` is checked by vat-vat-admin.js to
      // contain only known keys and types, none of which allow slots.  So any
      // slots in `argsCapData` will be associated with `vatParameters`.

      // first, split off vatParameters
      const args = kunser(argsCapData);
      const [bundleID, { vatParameters, ...dynamicOptions }] = args;
      assert(kernelKeeper.hasBundle(bundleID), bundleID);
      // assemble the marshalled vatParameters
      const marshalledVatParameters = kser(vatParameters);
      // incref slots while create-vat is on run-queue
      for (const kref of marshalledVatParameters.slots) {
        kernelKeeper.incrementRefCount(kref, 'create-vat-event');
      }
      const source = { bundleID };
      const vatID = kernelKeeper.allocateUnusedVatID();
      const event = {
        type: 'create-vat',
        vatID,
        source,
        vatParameters: marshalledVatParameters,
        dynamicOptions,
      };
      kernelKeeper.addToAcceptanceQueue(harden(event));
      // the device gets the new vatID immediately, and will be notified
      // later when it is created and a root object is available
      return harden(kser(vatID));
    },

    upgrade(argsCapData) {
      // marshal([vatID, bundleID, vatParameters]) -> upgradeID
      const args = kunser(argsCapData);
      const [vatID, bundleID, vatParameters, upgradeMessage] = args;
      insistVatID(vatID);
      assert.typeof(bundleID, 'string');
      assert.typeof(upgradeMessage, 'string');
      const marshalledVatParameters = kser(vatParameters);
      for (const kref of marshalledVatParameters.slots) {
        kernelKeeper.incrementRefCount(kref, 'upgrade-vat-event');
      }
      const upgradeID = kernelKeeper.allocateUpgradeID();
      const ev = {
        type: 'upgrade-vat',
        vatID,
        upgradeID,
        bundleID,
        vatParameters: marshalledVatParameters,
        upgradeMessage,
      };
      kernelKeeper.addToAcceptanceQueue(harden(ev));
      return harden(kser(upgradeID));
    },

    terminate(argsCapData) {
      // marshal([vatID, reason]) -> null
      const args = kunser(argsCapData);
      const [vatID, reason] = args;
      insistVatID(vatID);
      const marshalledReason = kser(reason);
      // we don't need to incrementRefCount because if terminateVat sends
      // 'reason' to vat-admin, it uses notifyTermination / queueToKref /
      // doSend, and doSend() does its own incref
      // FIXME: This assumes that most work of terminateVat happens in the
      // synchronous prelude, which should be made more obvious. For details,
      // see https://github.com/Agoric/agoric-sdk/pull/10055#discussion_r1754918394
      void terminateVat(vatID, true, marshalledReason);
      // TODO: terminateVat is async, result doesn't fire until worker
      // is dead. To fix this we'll probably need to move termination
      // to a run-queue ['terminate-vat', vatID] event, like createVat
      return harden(kser(undefined));
    },

    changeOptions(argsCapData) {
      // marshal([vatID, options]) -> null
      assert(argsCapData.slots.length === 0);
      const args = kunser(argsCapData);
      const [vatID, options] = args;
      insistVatID(vatID);
      const ev = {
        type: 'changeVatOptions',
        vatID,
        options,
      };
      kernelKeeper.addToAcceptanceQueue(harden(ev));
      return harden(kser(undefined));
    },
  };
}
