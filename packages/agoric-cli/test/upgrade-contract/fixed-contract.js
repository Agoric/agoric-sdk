import { Far } from '@endo/far';

export const start = async (zcf, _privateArgs, baggage) => {
  const { mint } = baggage.get('myMint');
  return harden({
    publicFacet: Far('buggyPublicFacet', {
      makeInvitationRightName: () => {
        return zcf.makeInvitation(`right invitation`, seat => {
          seat;
        });
      },
    }),
  });
};
