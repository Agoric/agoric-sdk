import harden from '@agoric/harden';
import { makeSharingService } from '@agoric/ertp/more/sharing/sharing';

// This vat contains the sharing service for the demo.

function build(E, log) {
  const sharingService = makeSharingService();

  function getSharingService() {
    return sharingService;
  }

  return harden({ getSharingService });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
