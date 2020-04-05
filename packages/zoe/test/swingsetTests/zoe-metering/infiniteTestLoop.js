import harden from '@agoric/harden';

export const makeContract = (zoe, _terms) => {
  const seat = harden({});
  const { invite } = zoe.makeInvitePair(seat, {
    seatDesc: 'tester',
  });
  return harden({
    publicAPI: {
      doTest: () => {
        for (;;) {
          // Nothing
        }
      },
    },
    invite,
  });
};
