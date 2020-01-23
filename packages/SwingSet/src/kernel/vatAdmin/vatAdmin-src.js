import harden from '@agoric/harden';

/**
 * A Vat management device that provides a capability that can be used to
 * create new vats. create(adminId, code) creates a new vat running code, and
 * returns the root object.
 *
 * setup(...) calls makeDeviceSlots(..., makeRootDevice, ...), which calls
 * deviceSlots' build() function (which invokes makeRootDevice) to create the
 * root device. Selected vats that need to create new vats can be given access
 * to the device.
 *
 * This code runs in the inner part of the device vat. It handles kernel objects
 * in serialized format, and can use SO() to send messages to them. The only
 * device object exposed to vats is the vat creator. The root objects for the
 * new vats are returned as javascript objects.
 *
 * We don't currently need to use SO, or to maintain state. All functionality is
 * provided by calling kernel functions and passing in the VatID. The wrapper
 * vat sends the VatID on every call.
 */
export default function setup(syscall, state, helpers, endowments) {
  const {
    create: kernelVatCreationFn,
    stats: kernelVatStatsFn,
    // terminate: kernelTerminateFn,
  } = endowments;

  // call the registered kernel function to create a new vat, and receive a
  // vatId in return. Clean up the outgoing and incoming arguments.
  function callKernelVatCreation(src) {
    return kernelVatCreationFn(`${src}`);
  }

  // Call the registered kernel function to request vat stats. Clean up the
  // outgoing and incoming arguments.
  function callKernelVatStats(vatId) {
    if (!kernelVatStatsFn || typeof kernelVatStatsFn !== 'function') {
      throw new Error(
        `Attempted to request stats before registering kernel function`,
      );
    }
    const cleanVatId = `${vatId}`;
    return kernelVatStatsFn(cleanVatId);
  }

  // makeRootDevice is called with { _SO, _getDeviceState, _setDeviceState } as
  // a parameter, but we don't need these, as discussed above.
  function makeRootDevice() {
    // The Root Device Node.
    return harden({
      // Called by the wrapper vat to create a new vat. Gets a new ID from the
      // kernel's vat creator fn. Remember that the root object will arrive
      // separately.
      create(code) {
        return callKernelVatCreation(code);
      },
      terminate(_vatID) {
        // TODO(hibbert)
      },
      adminStats(vatID) {
        return callKernelVatStats(vatID);
      },
    });
  }

  // return dispatch object
  return helpers.makeDeviceSlots(syscall, state, makeRootDevice, helpers.name);
}
