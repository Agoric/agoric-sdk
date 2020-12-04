// Borrow

//   const borrowInvitation = await E(lenderSeat).getOfferResult();

// Lender should send the borrowInvitation payment to the borrower, so
// that the borrower now has it in their wallet

// borrower makes the offer, gets a payout and an offerResult

const collateral = collateralKit.amountMath.make(collateralValue);

const invitationDetails = await E(zoe).getInvitationDetails(borrowInvitation);

// TODO: Get the maxLoan from the invitation

// TODO: get the collateral from the user's selection in the dapp,
// ensuring that it is larger than the required margin

const proposal = harden({
  want: { Loan: maxLoan },
  give: { Collateral: collateral },
});

// TODO: withdraw payments
const payments = { Collateral: collateralKit.mint.mintPayment(collateral) };
const borrowSeat = await E(zoe).offer(borrowInvitation, proposal, payments);
/** @type {ERef<BorrowFacet>} */
const borrowFacet = E(borrowSeat).getOfferResult();

// Pay Back and Close Loan

const closeLoanInvitation = await E(borrowFacet).makeCloseLoanInvitation();

const makeInvitation = (facet, purseDepositFacet) => {
  const closeLoanInvitation = await E(facet).makeCloseLoanInvitation();
  E(purseDepositFacet).receive(closeLoanInvitation);
}

const makeInvitation = (facet, purseDepositFacet, methodName) => {
  const invitation = await E(facet)[methodName]();
  E(purseDepositFacet).receive(invitation);
}

// TODO: get the amount required from the debtNotifier
// TODO: get the expected collateral payout from a method to be added
// to the borrowFacet

const proposal = harden({
  give: { Loan: required },
  want: { Collateral: collateralKit.amountMath.make(10) },
});

const payments = harden({
  Loan: loanKit.mint.mintPayment(required),
});

const seat = await E(zoe).offer(closeLoanInvitation, proposal, payments);

t.is(
  await seat.getOfferResult(),
  'your loan is closed, thank you for your business',
);

await checkPayouts(
  t,
  seat,
  { Loan: loanKit, Collateral: collateralKit },
  {
    Loan: loanKit.amountMath.getEmpty(),
    Collateral: collateralKit.amountMath.make(10),
  },
  'repaySeat',
);

// Pieces

// We've hard coded a lot of this in the wallet

// * Making an invitation from a presence with methods (often the offerResult)
// * Attenuating a presence with methods
// * Depositing an invitation
// * Finding an invitation, withdrawing it, and associating it with an
//     offer proposal
// * Withdrawing payments from particular purses and associating them
//   with an offer proposal
// * Depositing payouts in particular purses (deposit facet only)
// 
