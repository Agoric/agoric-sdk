import harden from '@agoric/harden';

export const makeContract = (zoe, terms) => {
  const seat = harden({});
  const { invite } = zoe.makeInvite(seat, {
    seatDesc: 'tester',
  });
  return harden({
    publicAPI: {
      doTest: () => {
        new Array(1e7).map(Object.create);
      },
    },
    invite,
    terms,
  });
}