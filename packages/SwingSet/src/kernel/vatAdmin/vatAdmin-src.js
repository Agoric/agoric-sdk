/**
 * A Vat management device that provides a capability that can be used to
 * create new vats. create(adminId, code) creates new vat running code, and
 * returns the root object.
 *
 * The main entry point is setup(). The other exports are for testing.
 * setup(...) calls makeDeviceSlots(..., makeRootDevice, ...), which calls
 * deviceSlots' build() function (which invokes makeRootDevice) to create the
 * root device. Selected vats that need to create new vats can be given access
 * to the device.
 *
 * This code runs in the inner half of the device vat. It handles kernel objects
 * in serialized format, and uses SO() to send messages to them. The only device
 * object exposed to vats is the vat creator. The root objects for the new
 * vats are returned as javascript objects.
 */

import harden from '@agoric/harden';

const vatAdminDevice = {
  setup: (syscall, state, helpers, endowments) => {
    let kernelVatCreationFn;
    let kernelVatStatsFn;
    let kernelTerminateFn;

    // Kernel calls this to give the device access to kernel functions for
    // creating a vat, requesting stats, and terminating vat.
    function setVatManagementFunctions(createFn, statsFn, terminateFn) {
      kernelVatCreationFn = createFn;
      kernelVatStatsFn = statsFn;
      kernelTerminateFn = terminateFn;
    }

    // call the registered kernel function to create a new vat, and receive a
    // vatId in return. Clean up the outgoing and incoming arguments.
    function callKernelVatCreation(src) {
      if (!kernelVatCreationFn || typeof kernelVatCreationFn !== 'function') {
        throw new Error(
          `Attempted to create vat before registering kernel function`,
        );
      }
      const vatId = kernelVatCreationFn(src);
      if (typeof vatId !== 'string' || !vatId.match('v\\d+$')) {
        throw new Error(`createDynamicVat should return a vatID: ${vatId}`);
      }
      return vatId;
    }

    // Call the registered kernel function to request vat stats. Clean up the
    // outgoing and incoming arguments.
    function callKernelVatStats(vatId) {
      if (!kernelVatStatsFn || typeof kernelVatStatsFn !== 'function') {
        throw new Error(
          `Attempted to request stats before registering kernel function`,
        );
      }
      return kernelVatStatsFn(vatId);
    }

    function makeRootDevice({ SO, getDeviceState, setDeviceState }) {
      const restart = getDeviceState();
      // entries are [adminID, vatID]
      const adminIdsToVatIds = restart ? restart.idMap : [];
      function adminIdToVatId(adminId) {
        for (const [key, value] of adminIdsToVatIds) {
          if (key === adminId) {
            return value;
          }
        }
        return undefined;
      }

      function saveState() {
        setDeviceState(
          harden({
            // save a copy to be hardened so we can still modify it.
            idMap: adminIdsToVatIds.slice(0),
          }),
        );
      }

      // The Root Device Node.
      return harden({
        // Called by the wrapper vat to create a new vat. Gets a new ID from the
        // kernel's vat creator fn. Remember that the root object will arrive
        // separately.
        create(adminId, code) {
          const vatId = callKernelVatCreation(code);
          adminIdsToVatIds.push([adminId, vatId]);

          saveState();
          return vatId;
        },
        terminate(adminId) {
          const vatID = adminIdToVatId(adminId);
          // TODO(hibbert)
        },
        adminStats(adminId) {
          return callKernelVatStats(adminIdToVatId(adminId));
        },
      });
    }

    endowments.registerVatCreationSetter(setVatManagementFunctions);

    // return dispatch object
    return helpers.makeDeviceSlots(
      syscall,
      state,
      makeRootDevice,
      helpers.name,
    );
  },
};

const vatAdminDeviceSrc = harden({
  setup: `${vatAdminDevice.setup}`,
});

export { vatAdminDeviceSrc };
