import { Far } from '@endo/far';

export const buildRootObject = () => {
  let count = 0;
  return Far('root', {
    bootstrap: () => 0,
    increment: () => {
      count += 1;
    },
    read: () => count,
  });
};
