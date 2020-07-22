export const makeContract = zcf => {
  const invite = zcf.makeInvitation(() => {}, 'tester');
  zcf.initPublicAPI(
    harden({
      doTest: () => {
        new Array(1e9).map(Object.create);
      },
    }),
  );
  return invite;
};
