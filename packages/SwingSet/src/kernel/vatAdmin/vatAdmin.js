/**
 * Endowments for a Vat management device that can be made available to SwingSet
 * vats.
 *
 * This is code that runs in the outer part of the device, which is in the
 * primal realm. Provides functions to allow the kernel to register a function
 * with the inner device which will create a new vat.
 */
export function buildVatAdmin() {
  let vatCreationSetterFunction;

  function registerVatCreationFunction(create, admin, terminate) {
    if (!vatCreationSetterFunction) {
      throw new Error(`vatCreationSetterFunction must already be set.`);
    }
    vatCreationSetterFunction(create, admin, terminate);
  }

  function registerVatCreationSetter(vatCreationSetterFn) {
    if (typeof vatCreationSetterFn !== 'function') {
      throw new Error(`vatCreationSetterFn must be a function.`);
    }
    vatCreationSetterFunction = vatCreationSetterFn;
  }

  return {
    endowments: { registerVatCreationSetter },
    registerVatCreationFunction,
  };
}
