import harden from '@agoric/harden';
import makeStore from '@agoric/store';
import makePromise from '@agoric/make-promise';
import { makeZoeHelpers } from './helpers/zoeHelpers';
import makeStateMachine from './helpers/stateMachine';

/**
 * Delivery vs. Payment contract for physical goods is accomplished by having a
 * third party receive the assets, and enable simultaneous electronic exchange
 * of the payment for an assurance of future delivery of the goods. The physical
 * delivery takes place out-of-band with respect to zoe, so the contract deals
 * only with two issuers, the assurance provider, and the payment currency. The
 * assurance provider (sometimes 'assurer') interacts with the contract to
 * acknowledge receipt of the goods from the seller, and to find out that the
 * trade has taken place, so they can deliver the goods to the buyer.
 */
const CURRENCY = 'Currency';
const ASSURANCE = 'Assurance';

const allowedTransitions = [
  ['Start', ['SellerAccepted']],
  ['SellerAccepted', ['AllAccepted']],
  ['AllAccepted', ['Funded']],
  ['Funded', ['Sent']],
  ['Sent', ['AssuranceSent']],
  ['AssuranceSent', []],
];

let nextId = 1001;

export const makeContract = harden(zoe => {
  const { assertKeywords, rejectIfNotProposal } = makeZoeHelpers(zoe);
  const {
    issuerKeywordRecord,
    terms, // handle, keywords,
  } = zoe.getInstanceRecord();
  const amountMaths = zoe.getAmountMaths(issuerKeywordRecord);
  const emptyAssurance = amountMaths.Assurance.getEmpty();
  const emptyCurrency = amountMaths.Currency.getEmpty();
  const currencyIssuer = issuerKeywordRecord.Currency;
  const assuranceIssuer = issuerKeywordRecord.Assurance;
  const { amount, Product: product } = terms;

  assertKeywords(harden([ASSURANCE, CURRENCY]));

  const receivedPayment = makePromise();
  const receivedAssurance = makePromise();
  let paymentInviteHandle;
  let deliverInviteHandle;
  let assurerInviteHandle;

  nextId += 1;
  const id = nextId;

  // Alice is seller; Bob is buyer; Carol is escrow agent

  // ESCROW AGENTS
  // set of available esrow agents
  // brand => agentFacet
  const escrowAgents = makeStore();
  function registerAgent(agent, issuer) {
    escrowAgents.init(issuer.getBrand(), agent);
  }

  const sm = makeStateMachine('Start', allowedTransitions);

  const shared = {
    id,
    currencyIssuer,
    assuranceIssuer,
    product,

    getStatus() {
      return sm.getStatus();
    },
    getAmount() {
      return amount;
    },
  };

  // An earlier concept. Replaced with the state machine moving in lockstep
  //
  // When the payment and assurance are received, we'll order them to be
  // reallocated to the opposing parties.
  Promise.all([receivedPayment.p, receivedAssurance.p]).then(receivables => {
    const [payment, assurance] = receivables;

    const paymentAmount = { Assurance: assurance, Currency: emptyCurrency };
    const assurerAmount = {
      Assurance: emptyAssurance,
      Currency: emptyCurrency,
    };
    const deliveryAmount = { Assurance: emptyAssurance, Currency: payment };
debugger
    zoe.reallocate(
      harden([paymentInviteHandle, deliverInviteHandle, assurerInviteHandle]),
      harden([paymentAmount, deliveryAmount, assurerAmount]),
    );
  });

  // The payment party start by depositing the funds with Zoe, and wants to get
  // the assurance in return.
  const makePaymentInvite = paymentHandle => {
    const seat = harden({
      payment: () => {
        const expected = harden({ give: [CURRENCY], want: [ASSURANCE] });
        // eslint-disable-next-line no-use-before-define
        rejectIfNotProposal(inviteHandle, expected);
        const { proposal } = zoe.getOffer(paymentHandle);
        receivedPayment.resolve(proposal.give.CURRENCY);
        sm.transitionTo(sm.Funded, sm.AllAccepted);
      },
      ...shared,
    });

    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'payment',
    });
    return invite;
  };

  // The assurer will provide the assurance (when they get the product
  // out-of-band).
  const makeAssurerInvite = assuranceHandle => {
    const seat = harden({
      provideAssurance: () => {
        const expected = harden({ give: [ASSURANCE] });
        // eslint-disable-next-line no-use-before-define
        rejectIfNotProposal(inviteHandle, expected);
        const { proposal } = zoe.getOffer(assuranceHandle);
        receivedAssurance.resolve(proposal.give.ASSURANCE);
        sm.transitionTo(sm.AssuranceSent, sm.Sent);
      },
      accept: () => {
        sm.transitionTo(sm.AllAccepted, sm.SellerAccepted);
      },
      ...shared,
    });
    // eslint-disable-next-line no-use-before-define
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'provideAssurance',
    });
    return invite;
  };

  const makeDeliveryInvite = () => {
    const seat = harden({
      /// This shouldn't be an action the seller can provoke. The escrow agent
      /// does this transition when the good arrive out-of-band.
      deliver: () => {
        const expected = harden({ want: [CURRENCY] });
        // eslint-disable-next-line no-use-before-define
        rejectIfNotProposal(inviteHandle, expected);
        sm.transitionTo('Sent', 'Funded');
      },
      accept: () => {
        sm.transitionTo(sm.SellerAccepted, sm.Start);
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'deliver',
    });
    return invite;
  };

  const makeContractCreationInvite = () => {
    const seat = harden({
      makeInvites: () => {
        const expected = harden({
          want: { Currency: emptyCurrency, Assurance: emptyAssurance },
          give: {},
          exit: ['afterDeadline'],
        });
debugger
        // eslint-disable-next-line no-use-before-define
        rejectIfNotProposal(inviteHandle, expected);
debugger
        return {
          deliveryInvite: makeDeliveryInvite(),
          paymentInvite: makePaymentInvite(),
          assuranceInvite: makeAssurerInvite(),
        };
      },
    });

    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'makeInvites',
    });
    return { invite, inviteHandle };
  };

  return harden({
    invite: makeContractCreationInvite(),
    publicAPI: { registerAgent },
  });
});
