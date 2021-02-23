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

import { Far } from '@agoric/marshal';

export function buildRootDeviceNode({ endowments, serialize }) {
  const {
    create: kernelVatCreationFn,
    stats: kernelVatStatsFn,
    terminate: kernelTerminateVatFn,
  } = endowments;

  // The Root Device Node.
  return Far('root', {
    // Called by the wrapper vat to create a new vat. Gets a new ID from the
    // kernel's vat creator fn. Remember that the root object will arrive
    // separately. Clean up the outgoing and incoming arguments.
    create(bundle, options) {
      const vatID = kernelVatCreationFn({ bundle }, options);
      return vatID;
    },
    createByName(bundleName, options) {
      const vatID = kernelVatCreationFn({ bundleName }, options);
      return vatID;
    },
    terminateWithFailure(vatID, reason) {
      kernelTerminateVatFn(vatID, serialize(reason));
    },
    // Call the registered kernel function to request vat stats. Clean up the
    // outgoing and incoming arguments.
    adminStats(vatID) {
      return kernelVatStatsFn(`${vatID}`);
    },
  });
}
