import { Far } from '@endo/marshal';
import makeScratchPad from './scratch.js';

// This vat contains the private upload scratch pad.

export const buildRootObject = _vatPowers => {
  const uploads = makeScratchPad();

  const getUploads = () => uploads;

  return Far('root', { getUploads });
};
