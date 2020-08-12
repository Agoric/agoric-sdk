export const start = zcf => {
  const creatorInvitation = zcf.makeInvitation(() => {}, 'tester');
  const publicFacet = harden({
    doTest: () => {
      new Array(1e9).map(Object.create);
    },
  });
  return harden({ creatorInvitation, publicFacet });
};
