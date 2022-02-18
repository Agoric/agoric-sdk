import { Far } from '@endo/marshal';

export const buildRootObject = vatPowers => {
  vatPowers.testLog(`bootstrap called`);
  return Far('root', {});
};
