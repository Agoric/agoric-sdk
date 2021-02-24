import { Far } from '@agoric/marshal';

export const start = _zcf => {
  const publicFacet = Far('publicFacet', {
    doTest: () => {
      new Array(1e9).map(Object.create);
    },
  });
  return harden({ publicFacet });
};
