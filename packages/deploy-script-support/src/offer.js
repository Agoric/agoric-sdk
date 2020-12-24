// @ts-check

import { E } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';

/** @type {MakeOfferHelper} */
export const makeOffer = (
  walletAdmin,
  zoe,
  zoeInvitationPurse,
  getLocalAmountMath,
) => {
  const withdrawPayments = (proposal, paymentsWithPursePetnames) => {
    return Object.fromEntries(
      Object.entries(paymentsWithPursePetnames).map(
        ([keyword, pursePetname]) => {
          const purse = E(walletAdmin).getPurse(pursePetname);
          const amountToWithdraw = proposal.give[keyword];
          const paymentP = E(purse).withdraw(amountToWithdraw);
          return [keyword, paymentP];
        },
      ),
    );
  };

  const withdrawInvitation = async invitationDetails => {
    // Let's go with the first one that fits our requirements
    const invitationAmount = await E(walletAdmin).findInvitationAmount(
      invitationDetails,
    );
    return E(zoeInvitationPurse).withdraw(invitationAmount);
  };

  const makeAmount = amountWithPetnames => {
    const { brand: brandPetname, value } = amountWithPetnames;
    const math = getLocalAmountMath(brandPetname);
    return math.make(value);
  };

  const makeProposalPart = giveOrWant => {
    return Object.fromEntries(
      Object.entries(giveOrWant).map(([keyword, amountWithPetnames]) => {
        const amount = makeAmount(amountWithPetnames);
        return [keyword, amount];
      }),
    );
  };

  const makeProposal = proposalWithPetnames => {
    const { want, give } = proposalWithPetnames;

    return harden({
      want: makeProposalPart(want || {}),
      give: makeProposalPart(give || {}),
      exit: proposalWithPetnames.exit,
    });
  };

  const getInvitation = (invitation, invitationDetails) => {
    if (invitation !== undefined) {
      return invitation;
    }
    assert(
      invitationDetails,
      `either an invitation or invitationDetails is required`,
    );
    return withdrawInvitation(invitationDetails);
    // TODO: handle instancePetname instead of instance
  };

  const depositPayouts = (seat, payoutPursePetnames) => {
    const makeDepositInPurse = keyword => payment => {
      const purse = payoutPursePetnames[keyword];
      E(purse).deposit(payment);
    };
    const handlePayments = paymentsP => {
      const allDepositedP = Promise.all(
        Object.entries(paymentsP).map(([keyword, paymentP]) => {
          const depositInPurse = makeDepositInPurse(keyword);
          return paymentP.then(depositInPurse);
        }),
      );
      return allDepositedP;
    };
    const paymentsPP = E(seat).getPayouts();
    return paymentsPP.then(handlePayments);
  };

  const makeSaveOfferResult = fullInvitationDetailsP => async offerResult => {
    // TODO: move entire offer process to wallet
    const fullInvitationDetails = await fullInvitationDetailsP;
    await E(walletAdmin).saveOfferResult(
      fullInvitationDetails.handle,
      offerResult,
    );
  };

  /** @type {OfferHelper} */
  const offer = config => {
    const {
      invitation,
      partialInvitationDetails,
      proposalWithBrandPetnames,
      paymentsWithPursePetnames,
      payoutPursePetnames,
    } = config;

    const invitationToUse = getInvitation(invitation, partialInvitationDetails);
    const fullInvitationDetailsP = E(zoe).getInvitationDetails(invitationToUse);
    const proposal = makeProposal(proposalWithBrandPetnames);
    const payments = withdrawPayments(proposal, paymentsWithPursePetnames);

    const seat = E(zoe).offer(invitationToUse, proposal, payments);

    const deposited = depositPayouts(seat, payoutPursePetnames);

    const offerResultP = E(seat).getOfferResult();
    const saveOfferResult = makeSaveOfferResult(fullInvitationDetailsP);
    offerResultP.then(saveOfferResult);
    return {
      seat,
      deposited,
      invitationDetailsPromise: fullInvitationDetailsP,
    };
  };
  return offer;
};
