import { Far } from '@agoric/marshal';
import { makeRegistrar } from '@agoric/registrar';

// This vat contains the registrar for the demo.

export function buildRootObject(_vatPowers) {
  const sharedRegistrar = makeRegistrar();

  function getSharedRegistrar() {
    return sharedRegistrar;
  }

  return Far('root', { getSharedRegistrar });
}
