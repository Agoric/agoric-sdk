import { assert } from '@endo/errors';
import { E } from '@endo/eventual-send';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {ZCF} zcf
 * @param {Proposal} [proposal]
 * @param {PaymentPKeywordRecord} [payments]
 * @param {Pattern} [proposalShape]
 * @param {string} [description]
 * @returns {Promise<{zcfSeat: ZCFSeat, userSeat: UserSeat}>}
 */
export const makeOffer = async (
  zoe,
  zcf,
  proposal,
  payments,
  proposalShape = undefined,
  description = 'seat',
) => {
  let zcfSeat;
  const getSeat = seat => {
    zcfSeat = seat;
  };
  const invitationP = zcf.makeInvitation(
    getSeat,
    description,
    undefined,
    proposalShape,
  );
  const userSeat = await E(zoe).offer(invitationP, proposal, payments);
  assert(zcfSeat);
  return { zcfSeat, userSeat };
};
