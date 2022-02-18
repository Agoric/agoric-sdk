import { Far } from '@endo/marshal';

export const buildRootObject = (_vatPowers, _vatParameters) => {
  const contents = [];
  const append = thing => {
    contents.push(thing);
    return harden([...contents]);
  };

  const target = Far('root', {
    append,
  });

  return target;
};
