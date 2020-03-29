// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const operaConcertTicketRoot = `${__dirname}/../../../src/contracts/operaConcertTicket`;

test(`__Test Scenario__

The Opera de Bordeaux plays the contract creator and the auditorium
It creates the contract for a show ("Steven Universe, the Opera", Web, March 25th 2020 at 8pm, 3 tickets)
The Opera wants 22 moolas per ticket

Alice buys ticket #1

Bob tries to buy ticket 1 and fails. He buys ticket #2 and #3

Christine asks the contract for an invite and the contract answers that there are no tickets left to buy

The Opera is told about the show being sold out. It gets all the moolas from the sale`, async t => {  

  // Setup initial conditions
  const { mints, issuers: defaultIssuers, moola } = setup();
  const [moolaIssuer] = defaultIssuers;
  const [moolaMint] = mints;

  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();

  let publicAPI;

  { // === Initial Opera de Bordeaux part === 
    const { source, moduleFormat } = await bundleSource(operaConcertTicketRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const { invite: auditoriumInvite } = await zoe.makeInstance(installationHandle, harden({Buyer: moolaIssuer}), {
      show: "Steven Universe, the Opera",
      start: "Web, March 25th 2020 at 8pm",
      count: 3,
      expectedAmountPerTicket: moola(22)
    });

    const {
      extent: [{ instanceHandle: auditoriumInstanceHandle }],
    } = await inviteIssuer.getAmountOf(auditoriumInvite);
    
    const { publicAPI: pub } = zoe.getInstance(auditoriumInstanceHandle);


    // The auditorium redeems its invite. It contains a function to get all the moolas accumulated by the contract
    // as part of the ticket sales
    const {
      seat: {getSalesMoney}
    } = await zoe.redeem(auditoriumInvite, harden({}), undefined);

    t.equal(typeof getSalesMoney, 'function', 'getSalesMoney should be a function');

    // The Opera makes the publicAPI function publicly available
    publicAPI = pub;
  }
  t.equal(typeof publicAPI.makeBuyerInvite, 'function', 'makeBuyerInvite should be a function')
  t.equal(typeof publicAPI.getTicketIssuer, 'function', 'getTicketIssuer should be a function')
  t.equal(typeof publicAPI.getAvailableTickets, 'function', 'getAvailableTickets should be a function')


  
  { // === Alice part ===
  // Alice starts with 100 moolas
    const alicePurse = moolaIssuer.makeEmptyPurse()
    alicePurse.deposit(moolaMint.mintPayment(moola(100)));

    // Alice makes an invite
    const aliceInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite().invite)
    const {
      extent: [{ instanceHandle: instanceHandleOfAlice }],
    } = await inviteIssuer.getAmountOf(aliceInvite);

    const {terms: termsOfAlice} = await zoe.getInstance(instanceHandleOfAlice)

    // Alice checks terms
    t.equal(termsOfAlice.show, "Steven Universe, the Opera")
    t.equal(termsOfAlice.start, "Web, March 25th 2020 at 8pm")
    t.equal(termsOfAlice.expectedAmountPerTicket.brand, moola(22).brand)
    t.equal(termsOfAlice.expectedAmountPerTicket.extent, moola(22).extent)

    const availableTickets = await publicAPI.getAvailableTickets()

    // and sees the currently available tickets
    t.equal(availableTickets.size, 3, 'Alice should see 3 available tickets')
    t.ok([...availableTickets.keys()].includes(1), `availableTickets contains ticket number 1`)
    t.ok([...availableTickets.keys()].includes(2), `availableTickets contains ticket number 2`)
    t.ok([...availableTickets.keys()].includes(3), `availableTickets contains ticket number 3`)

    const aliceProposal = harden({
      give: {Buyer: termsOfAlice.expectedAmountPerTicket},
      want: {Auditorium: [...availableTickets.values()].find(t => t.extent[0].number === 1)},
    });
    const alicePaymentForTicket = await alicePurse.withdraw(termsOfAlice.expectedAmountPerTicket);

    const {seat: {performExchange}, payout: payoutP} = await zoe.redeem(aliceInvite, aliceProposal, {Buyer: alicePaymentForTicket})
    
    performExchange(); // this function call may be useless? See https://github.com/Agoric/agoric-sdk/issues/783

    const alicePayout = await payoutP

    const aliceTicketPayment = await publicAPI.getTicketIssuer().claim(alicePayout.Auditorium);
    const aliceBoughtTicketAmount = await publicAPI.getTicketIssuer().getAmountOf(aliceTicketPayment)

    t.equal(aliceBoughtTicketAmount.extent[0].show, "Steven Universe, the Opera", 'Alice should have receieved the ticket for the correct show')
    t.equal(aliceBoughtTicketAmount.extent[0].number, 1, 'Alice should have receieved the ticket for the correct number')
  }

  try{

    { // === Bob part ===
      // Bob starts with 100 moolas
      const bobPurse = moolaIssuer.makeEmptyPurse()
      bobPurse.deposit(moolaMint.mintPayment(moola(100)));

      // Bob makes an invite
      const bobInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite().invite)
      const {
        extent: [{ instanceHandle: instanceHandleOfBob }],
      } = await inviteIssuer.getAmountOf(bobInvite);

      const {terms: termsOfBob} = await zoe.getInstance(instanceHandleOfBob)

      const {expectedAmountPerTicket: expectedAmountPerTicketOfBob} = termsOfBob;

      // Bob does NOT check available tickets and tries to buy the ticket number 1 (already bought by Alice, but he doesn't know)
      const ticket1Amount = publicAPI.getTicketIssuer().getAmountMath().make(harden([{
        show: termsOfBob.show,
        start: termsOfBob.start,
        number: 1
      }]))

      const bobProposal = harden({
        give: {Buyer: expectedAmountPerTicketOfBob},
        want: {Auditorium: ticket1Amount},
      });
      const bobFirstPaymentForTicket = await bobPurse.withdraw(expectedAmountPerTicketOfBob);
    
      const {seat: {performExchange}, payout: payoutP} = await zoe.redeem(bobInvite, bobProposal, {Buyer: bobFirstPaymentForTicket})

      t.throws(performExchange, `Bob call to performExchange should throw`)

      const firstBobPayout = await payoutP;

      const bobFirstTicketAmount = await publicAPI.getTicketIssuer().getAmountOf(firstBobPayout.Auditorium);
      const bobFirstRefundAmount = await moolaIssuer.getAmountOf(firstBobPayout.Buyer)

      t.equal(bobFirstTicketAmount.extent.length, 0, 'Bob should not receive ticket #1')
      t.equal(bobFirstRefundAmount.extent, 22, 'Bob should get a refund after trying to get ticket #1')
    
      // deposit the refund back to the purse
      bobPurse.deposit(await firstBobPayout.Buyer)

      
      const availableTickets = await publicAPI.getAvailableTickets()

      // and sees the currently available tickets
      t.equal(availableTickets.size, 2, 'Bob should see 2 available tickets')
      t.ok(![...availableTickets.keys()].includes(1), `availableTickets should NOT contain ticket number 1`)
      t.ok([...availableTickets.keys()].includes(2), `availableTickets should still contain ticket number 2`)
      t.ok([...availableTickets.keys()].includes(3), `availableTickets should still contain ticket number 3`)
      
      throw `TODO Bob buys ticket #2 and #3`
    }

    // === Final Opera part ===
    // getting the money back
  
  }
  catch(e){
    console.error('caught err', e)
    t.fail('should not throw')
  }
  


  t.end()
});