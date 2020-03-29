import { makeZoeHelpers, defaultAcceptanceMsg } from './helpers/zoeHelpers';

import produceIssuer from '@agoric/ertp';

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

  const zoeService = zoe.getZoeService();

  // Create the internal ticket mint
  const { issuer, mint, amountMath } = produceIssuer('Opera tickets', 'set');
  await zoe.addNewIssuer(issuer, 'Auditorium');

  // create Zoe helpers after zoe.addNewIssuer because of https://github.com/Agoric/agoric-sdk/issues/802
  const {
    rejectOffer,
    checkIfProposal,
    swap,
    canTradeWith,
    getActiveOffers,
    assertKeywords,
  } = makeZoeHelpers(zoe);
  
  const { terms: { show, start, count, expectedAmountPerTicket } } = zoe.getInstanceRecord();
  
  const ticketDescriptionObjects = Array(count)
    .fill()
    .map((_, i) => harden({ show, start, number: i + 1 }));

  // Zoe probably does this book-keeping already with (in)active offers
  // TODO figure out if yes and change getAvailableTickets implementation accordingly
  const availableTicketAmountsByTicketNumber = new Map(
    ticketDescriptionObjects.map(description => [description.number, amountMath.make(harden([description]))])
  )

  // Create the offers in Zoe for the tickets
  const ticketPaymentPayoutInviteHandles = new Map(await Promise.all(
    [...availableTicketAmountsByTicketNumber.entries()].map(([ticketNumber, amount]) => {
      // create an Zoe invite internally...
      const {invite, inviteHandle} = zoe.makeInvite()
      // ...and redeem it right away
      return zoeService.redeem(
        invite,
        harden({want: {Buyer: expectedAmountPerTicket}, give: {Auditorium: amount}}),
        harden({Auditorium: mint.mintPayment(amount)}) // mint and pass to Zoe right away
      ).then(({payout}) => {
        return [ticketNumber, {payout, inviteHandle}]
      })
    })
  ))
  
  const auditoriumSeat = harden({
    getSalesMoney(){
      throw `TODO`
    }
  })
  const auditoriumInvite = zoe.makeInvite(auditoriumSeat);

  const makeBuyerInvite = () => {
    const seat = harden({
      performExchange: () => {
        const buyerInviteHandle = inviteHandle;
        const buyerOffer = zoe.getOffer(buyerInviteHandle)
        const buyerWant = buyerOffer.proposal.want.Auditorium;

        const ticketNumber = buyerWant.extent[0].number

        if(!availableTicketAmountsByTicketNumber.has(ticketNumber)){
          return rejectOffer(inviteHandle, `Ticket #${ticketNumber} is not available anymore`)
        }

        const {inviteHandle: ticketInviteHandle} = ticketPaymentPayoutInviteHandles.get(ticketNumber)

        try{
          swap(ticketInviteHandle, buyerInviteHandle)
        }
        catch(e){
          throw e;
        }
        // swap was succesful
        availableTicketAmountsByTicketNumber.delete(ticketNumber)
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return { invite, inviteHandle };
  };

  return harden({
    invite: auditoriumInvite,
    publicAPI: { 
      makeBuyerInvite,
      getTicketIssuer(){
        return issuer;
      },
      getAvailableTickets(){
        return new Map(availableTicketAmountsByTicketNumber);
      }
    },
  });
});
