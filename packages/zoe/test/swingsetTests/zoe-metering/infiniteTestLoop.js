import { Far } from '@agoric/marshal';

export const start = _zcf => {
  const publicFacet = Far('publicFacet', {
    doTest: () => {
      for (;;) {
        // Nothing
      }
    },
  });
  return harden({ publicFacet });
};
