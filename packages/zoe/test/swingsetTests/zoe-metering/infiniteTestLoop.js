export const start = _zcf => {
  const publicFacet = harden({
    doTest: () => {
      for (;;) {
        // Nothing
      }
    },
  });
  return harden({ publicFacet });
};
