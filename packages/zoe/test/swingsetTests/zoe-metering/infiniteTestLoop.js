import harden from '@agoric/harden';

export const makeContract = zcf => {
  const invite = zcf.makeInvitation(() => {}, 'tester');
  zcf.initPublicAPI(
    harden({
      doTest: () => {
        for (;;) {
          // Nothing
        }
      },
    }),
  );
  return invite;
};
