import harden from '@agoric/harden';

export const makeContract = zoe => {
  const invite = zoe.makeInvitation(() => {}, 'tester');
  return harden({
    invite,
    publicAPI: {
      doTest: () => {
        for (;;) {
          // Nothing
        }
      },
    },
  });
};
