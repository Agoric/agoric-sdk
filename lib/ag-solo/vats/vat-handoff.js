import harden from '@agoric/harden';
import { makeHandoffService } from '@agoric/ertp/more/handoff/handoff';

// This vat contains the handoff service for the demo.

function build(E, log) {
  const sharedHandoffService = makeHandoffService();

  function getSharedHandoffService() {
    return sharedHandoffService;
  }

  return harden({ getSharedHandoffService });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
