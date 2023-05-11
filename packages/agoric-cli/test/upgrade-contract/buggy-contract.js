import { Far } from '@endo/far';

export const start = async (zcf, _privateArgs, baggage) => {
  baggage.init('myMint', zcf.makeMint('GoodStuff'));
  return harden({
    publicFacet: Far('buggyPublicFacet', {
      makeInvitationWrongName: () => {
        return zcf.makeInvitation('oops, wrong name', () => {});
      },
    }),
  });
};
