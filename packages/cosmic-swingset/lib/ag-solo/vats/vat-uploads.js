import { Far } from '@agoric/marshal';
import makeScratchPad from './scratch';

// This vat contains the private upload scratch pad.

export function buildRootObject(_vatPowers) {
  const uploads = makeScratchPad();

  function getUploads() {
    return uploads;
  }

  return Far('root', { getUploads });
}
