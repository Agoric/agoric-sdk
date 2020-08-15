export const start = _zcf => {
  const publicFacet = harden({
    doTest: () => {
      new Array(1e9).map(Object.create);
    },
  });
  return harden({ publicFacet });
};
