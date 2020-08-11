export const start = zcf => {
  const creatorInvitation = zcf.makeInvitation(() => {}, 'tester');
  const publicFacet = harden({
    doTest: () => {
      for (;;) {
        // Nothing
      }
    },
  });
  return harden({ creatorInvitation, publicFacet });
};
