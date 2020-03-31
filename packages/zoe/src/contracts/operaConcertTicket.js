/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from './helpers/zoeHelpers';

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

export const makeContract = harden(async zoe => {
  // Create the internal ticket mint
  const { issuer, mint, amountMath } = produceIssuer('Opera tickets', 'set');
  await zoe.addNewIssuer(issuer, 'Ticket');

  // create Zoe helpers after zoe.addNewIssuer because of https://github.com/Agoric/agoric-sdk/issues/802
  const { rejectOffer, swap } = makeZoeHelpers(zoe);

  const {
    terms: { show, start, count },
  } = zoe.getInstanceRecord();

  const inviteHandleByTicketNumber = new Map();

  const auditoriumSeat = harden({
    makePaymentsAndInvites() {
      if(inviteHandleByTicketNumber.size >= 1){
        throw new Error('makePaymentsAndInvites cannot be called twice')
      }

      return Array(count)
      .fill()
      .map((_, i) => {
        const ticketNumber = i + 1;
        const ticketDescription = harden({ show, start, number: ticketNumber });
        const ticketAmount = amountMath.make(harden([ticketDescription]));
        const payment = mint.mintPayment(ticketAmount);

        const { invite, inviteHandle } = zoe.makeInvite();
        inviteHandleByTicketNumber.set(ticketNumber, inviteHandle)

        return {invite, ticketAmount, payment}
      });
    },
  });

  const auditoriumInvite = zoe.makeInvite(auditoriumSeat);

  const makeBuyerInvite = () => {
    const seat = harden({
      getTerms: () => terms,
      performExchange: async () => {
        const moneyInviteHandle = inviteHandle;
        const moneyOffer = zoe.getOffer(moneyInviteHandle);
        const moneyWant = moneyOffer.proposal.want.Ticket;

        const ticketNumber = moneyWant.extent[0].number;
        const ticketInviteHandle = inviteHandleByTicketNumber.get(ticketNumber)

        swap(ticketInviteHandle, moneyInviteHandle);
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return invite;
  };

  return harden({
    invite: auditoriumInvite,
    publicAPI: {
      makeBuyerInvite,
      getTicketIssuer() {
        return issuer;
      },
      // This function returns a Map<TicketNumber, TicketExtent>
      getAvailableTickets() {
        return new Map([...inviteHandleByTicketNumber]
          .filter(([number, offerHandle]) =>  zoe.isOfferActive(offerHandle) )
          .map(([number, offerHandle]) => {
            const {proposal: {give: {Ticket}}} = zoe.getOffer(offerHandle)            
            return [number, Ticket.extent[0]]
          })
        )
      },
    },
  });
});
