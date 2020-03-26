import { makeZoeHelpers, defaultAcceptanceMsg } from './helpers/zoeHelpers';

/*
    Roles in the arrangement:
    - Contract creator: describes the contract with:
        - number of seats, show, date/time of start
        - expected (ERTP) amount per ticket (we assume all tickets cost the same)
    - Smart Contract: 
        - mints the tickets
        - provides the seats
    - Auditorium (unique contract seat, usually taken by the contract creator): the person hosting 
    the Opera show, selling the tickets and getting the payment back
    - Ticket buyers (contract seat created on demand): 
        - can see the available opera show seats
        - can consult the terms
        - can redeem the zoe invite with the proper payment to get the ticket back
*/

export const makeContract = harden(zoe => {

  const {
    rejectOffer,
    checkIfProposal,
    swap,
    canTradeWith,
    getActiveOffers,
    assertKeywords,
  } = makeZoeHelpers(zoe);


  const auditoriumSeat = harden({
    getSalesMoney(){
      throw `TODO`
    }
  })
  const auditoriumInvite = zoe.makeInvite(auditoriumSeat);


  const makeBuyerInvite = () => {
    const seat = harden({
      addOrder: () => {
        throw `TODO`
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return { invite, inviteHandle };
  };

  return harden({
    invite: auditoriumInvite,
    publicAPI: { makeBuyerInvite },
  });
});
