import { Far } from '@endo/far';

export const buildRootObject = () => {
  return Far('root', {
    bootstrap: async (vats, devices) => {},
  });
};
