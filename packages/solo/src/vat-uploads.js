import makeScratchPad from '@agoric/internal/src/scratch.js';
import { Far } from '@endo/marshal';

// This vat contains the private upload scratch pad.

export function buildRootObject() {
  const uploads = makeScratchPad();

  function getUploads() {
    return uploads;
  }

  return Far('root', { getUploads });
}
