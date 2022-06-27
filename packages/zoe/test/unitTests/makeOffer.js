// @ts-check

import { E } from '@endo/eventual-send';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {ZCF} zcf
 * @param {Proposal=} proposal
 * @param {PaymentPKeywordRecord=} payments
 * @param {Pattern} [proposalSchema]
 * @returns {Promise<{zcfSeat: ZCFSeat, userSeat: UserSeat}>}
 */
export const makeOffer = async (
  zoe,
  zcf,
  proposal,
  payments,
  proposalSchema = undefined,
) => {
  let zcfSeat;
  const getSeat = seat => {
    zcfSeat = seat;
  };
  const invitationP = zcf.makeInvitation(
    getSeat,
    'seat',
    undefined,
    proposalSchema,
  );
  const userSeat = await E(zoe).offer(invitationP, proposal, payments);
  assert(zcfSeat);
  return { zcfSeat, userSeat };
};
