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
  await zoe.addNewIssuer(issuer, 'Ticket');

  // create Zoe helpers after zoe.addNewIssuer because of https://github.com/Agoric/agoric-sdk/issues/802
  const {
    rejectOffer,
    checkIfProposal,
    swap,
    canTradeWith,
    getActiveOffers,
    assertKeywords,
  } = makeZoeHelpers(zoe);
  
  const { 
    terms: { show, start, count, expectedAmountPerTicket }, 
    issuerKeywordRecord: {Money: moneyIssuer}
  } = zoe.getInstanceRecord();
  
  const availableTicketDescriptionByNumber = new Map(Array(count)
    .fill()
    .map((_, i) => [i+1, harden({ show, start, number: i + 1 })]))
  
  const salesPayouts = new Set()

  const auditoriumSeat = harden({
    async getSalesPayment(){
      const salesPaymentsP = Promise.all([...salesPayouts])
        .then(payouts => Promise.all(payouts.map(payout => payout.Money)))
      
      return salesPaymentsP.then(salesPayments => moneyIssuer.combine(salesPayments));
    }
  })
  const auditoriumInvite = zoe.makeInvite(auditoriumSeat);

  const makeBuyerInvite = () => {
    const seat = harden({
      performExchange: async () => {
        const moneyInviteHandle = inviteHandle;
        const moneyOffer = zoe.getOffer(moneyInviteHandle)
        const moneyWant = moneyOffer.proposal.want.Ticket;

        const ticketNumbers = moneyWant.extent.map(e => e.number)

        const unavailableTicketNumbers = ticketNumbers.filter(number => (!availableTicketDescriptionByNumber.has(number)))

        if(unavailableTicketNumbers.length >= 1){
          return rejectOffer(inviteHandle, `Some tickets (${unavailableTicketNumbers.join(', ')}) are not available anymore`)
        }

        const ticketsAmount = amountMath.make(
          harden(ticketNumbers.map(number => availableTicketDescriptionByNumber.get(number)))
        )

        // create an zoe invite...
        const {invite, inviteHandle: ticketInviteHandle} = zoe.makeInvite()
        // ...and redeem it right away
        const {payout} = await zoeService.redeem(
          invite,
          harden({
            want: {Money: moneyIssuer.getAmountMath().make(expectedAmountPerTicket.extent*ticketNumbers.length)}, 
            give: {Ticket: ticketsAmount}
          }),
          harden({Ticket: mint.mintPayment(ticketsAmount)}) // mint and pass to Zoe right away
        )

        salesPayouts.add(payout)

        swap(ticketInviteHandle, moneyInviteHandle)
        
        // swap may throw. It we're here, swap was successful
        for(const number of ticketNumbers)
          availableTicketDescriptionByNumber.delete(number)
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return invite;
  };

  return harden({
    invite: auditoriumInvite,
    publicAPI: { 
      makeBuyerInvite,
      getTicketIssuer(){
        return issuer;
      },
      // This function returns a Map<TicketNumber, TicketExtent>
      getAvailableTickets(){
        return new Map(availableTicketDescriptionByNumber);
      }
    },
  });
});
