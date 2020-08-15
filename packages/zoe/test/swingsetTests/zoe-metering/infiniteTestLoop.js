export const start = zcf => {
  const publicFacet = harden({
    doTest: () => {
      for (;;) {
        // Nothing
      }
    },
  });
  return harden({ publicFacet });
};
