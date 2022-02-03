import { Far } from '@endo/far';
import { makeSharingService } from '@agoric/sharing-service';

// This vat contains the sharing service for the demo.

export function buildRootObject(_vatPowers) {
  const sharingService = makeSharingService();

  function getSharingService() {
    return sharingService;
  }

  return Far('root', { getSharingService });
}
