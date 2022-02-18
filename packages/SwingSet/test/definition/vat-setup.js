import { Far, getInterfaceOf } from '@endo/marshal';

export const buildRootObject = _vatPowers => {
  let counter = 0;
  return Far('root', {
    increment: () => {
      counter += 1;
    },
    read: () => counter,
    remotable: () => {
      const r = Far('iface1');
      return getInterfaceOf(r);
    },
  });
};
