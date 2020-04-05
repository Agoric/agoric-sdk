import harden from '@agoric/harden';

export const makeContract = zoe => {
  const invite = zoe.makeInvitation(() => {}, {
    inviteDesc: 'tester',
  });
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
