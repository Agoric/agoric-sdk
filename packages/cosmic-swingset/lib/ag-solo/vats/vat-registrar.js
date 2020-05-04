import harden from '@agoric/harden';
import { makeRegistrar } from '@agoric/registrar';

// This vat contains the registrar for the demo.

function build(_E, _log) {
  const sharedRegistrar = makeRegistrar();

  function getSharedRegistrar() {
    return sharedRegistrar;
  }

  return harden({ getSharedRegistrar });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
