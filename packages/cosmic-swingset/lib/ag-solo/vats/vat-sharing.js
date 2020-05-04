import harden from '@agoric/harden';
import { makeSharingService } from '@agoric/sharing-service';

// This vat contains the sharing service for the demo.

function build(_E, _log) {
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
