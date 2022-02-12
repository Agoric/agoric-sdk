/**
 * A Vat management device that provides a capability that can be used to
 * create new vats. create(adminId, code) creates a new vat running code, and
 * returns the root object.
 *
 * This code runs in the inner part of the device vat. The only device object
 * exposed to vats is the vat creator. The root objects for the new vats are
 * returned as javascript objects.
 *
 * buildRootDeviceNode() is called with { SO, getDeviceState, setDeviceState,
 * endowments }. We don't currently need to use SO, or to maintain state. All
 * functionality is provided by calling kernel functions and passing in the
 * VatID. The wrapper vat sends the VatID on every call.
 *
 * @param {Object} param0
 * @param {Record<string, any>} param0.endowments
 * @param {*} param0.serialize
 */

import { Far } from '@endo/marshal';
import { Nat } from '@agoric/nat';
import { assert } from '@agoric/assert';

export function buildRootDeviceNode({ endowments, serialize }) {
  const {
    pushCreateVatBundleEvent,
    pushCreateVatIDEvent,
    getBundleIDByName,
    terminate: kernelTerminateVatFn,
    meterCreate,
    meterAddRemaining,
    meterSetThreshold,
    meterGet,
  } = endowments;

  // The Root Device Node.
  return Far('root', {
    createMeter(remaining, threshold) {
      return meterCreate(Nat(remaining), Nat(threshold));
    },
    createUnlimitedMeter() {
      return meterCreate('unlimited', 0n);
    },
    addMeterRemaining(meterID, delta) {
      meterAddRemaining(meterID, Nat(delta));
    },
    setMeterThreshold(meterID, threshold) {
      meterSetThreshold(meterID, Nat(threshold));
    },
    getMeter(meterID) {
      return meterGet(meterID);
    },

    // Called by the wrapper vat to create a new vat. Gets a new ID from the
    // kernel's vat creator fn. Remember that the root object will arrive
    // separately. Clean up the outgoing and incoming arguments.
    createByBundle(bundle, options = {}) {
      const vatID = pushCreateVatBundleEvent(bundle, options);
      return vatID;
    },
    createByBundleID(bundleID, options = {}) {
      assert.typeof(bundleID, 'string');
      const vatID = pushCreateVatIDEvent(bundleID, options);
      return vatID;
    },
    createByName(bundleName, options = {}) {
      assert.typeof(bundleName, 'string');
      let bundleID;
      try {
        bundleID = getBundleIDByName(bundleName);
      } catch (e) {
        throw Error(`unregistered bundle name '${bundleName}'`);
      }
      const vatID = pushCreateVatIDEvent(bundleID, options);
      return vatID;
    },
    terminateWithFailure(vatID, reason) {
      kernelTerminateVatFn(vatID, serialize(reason));
    },
  });
}
