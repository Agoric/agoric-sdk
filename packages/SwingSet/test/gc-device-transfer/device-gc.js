import { Far } from '@endo/marshal';

export const buildRootDeviceNode = ({ setDeviceState }) => {
  let stash;
  return Far('root', {
    set: arg => {
      setDeviceState(arg);
      stash = arg;
    },
    get: () => stash,
  });
};
