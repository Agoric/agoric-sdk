import { Far } from '@endo/marshal';
import makeScratchPad from './scratch.js';

// This vat contains the private upload scratch pad.

export function buildRootObject(_vatPowers) {
  const uploads = makeScratchPad();

  function getUploads() {
    return uploads;
  }

  return Far('root', { getUploads });
}
