// Copyright (C) 2019 Agoric, under Apache License 2.0

import Nat from '@agoric/nat';
import harden from '@agoric/harden';
import evaluate from '@agoric/evaluate';

import { allSettled } from '../../collections/allSettled';
import { insist } from '../../collections/insist';
import { allComparable } from '../../collections/sameStructure';
import { makeNatAssay } from './assays';
import { makeMetaIssuerController } from './issuers';
import makePromise from '../../src/kernel/makePromise';

function makeContractHost(E) {
  // Maps from seat identity to seats
  const seats = new WeakMap();

  const controller = makeMetaIssuerController('contract host');
  const metaIssuer = controller.getMetaIssuer();
  const metaAssay = metaIssuer.getAssay();

  function redeem(allegedInvitePayment) {
    const allegedMetaAmount = allegedInvitePayment.getXferBalance();
    const metaAmount = metaAssay.vouch(allegedMetaAmount);
    insist(!metaAssay.isEmpty(metaAmount))`\
No invites left`;
    const baseAmount = metaAssay.quantity(metaAmount);
    const seatIdentity = baseAmount.label.identity;
    insist(seats.has(seatIdentity))`\
Not a registered invite seat identity ${seatIdentity}`;
    return E.resolve(metaIssuer.slash(metaAmount, allegedInvitePayment)).then(
      _ => seats.get(seatIdentity),
    );
  }

  // The contract host is designed to have a long-lived credible
  // identity.
  //
  // TODO: The contract host `start` method should spin off a new vat
  // for each new contract instance.
  const contractHost = harden({
    getInviteIssuer() {
      return controller.getMetaIssuer();
    },

    // The `contractSrc` is code for a contract function parameterized
    // by `terms` and `inviteMaker`. `start` evaluates this code,
    // calls that function to start the contract, and returns whatever
    // the contract returns.
    start(contractSrc, termsP) {
      contractSrc = `${contractSrc}`;
      const contract = evaluate(contractSrc, {
        Nat,
        harden,
        console,
        E,
        makePromise,
      });

      return E.resolve(allComparable(termsP)).then(terms => {
        const inviteMaker = harden({
          // Used by the contract to make invites for credibly
          // participating in the contract. The returned invite can be
          // redeemed for this seat. The inviteMaker contributes the
          // description `{ contractSrc, terms, seatDesc }`. If this
          // contract host redeems an invite, then the contractSrc and
          // terms are accurate. The seatDesc is according to that
          // contractSrc code.
          make(seatDesc, seat, name = 'an invite payment') {
            const baseDescription = harden({
              contractSrc,
              terms,
              seatDesc,
            });
            // Note that an empty object is pass-by-presence, and so
            // has an unforgeable identity.
            const seatIdentity = harden({});
            const baseLabel = harden({
              identity: seatIdentity,
              description: baseDescription,
            });
            const baseAssay = makeNatAssay(baseLabel);
            const baseAmount = baseAssay.make(1);
            controller.register(baseAssay);
            seats.set(seatIdentity, seat);
            const metaOneAmount = metaAssay.make(baseAmount);
            // This should be the only use of the meta mint, to make a
            // meta purse whose quantity is one unit of a base amount
            // for a unique base label. This meta purse makes the
            // returned meta payment, and then the empty meta purse is
            // dropped, in the sense that it becomes inaccessible. But
            // it is not yet collectable. Until the returned payment
            // is deposited, it will retain the metaPurse, as the
            // metaPurse contains the usage rights.
            const metaPurse = controller
              .getMetaMint()
              .mint(metaOneAmount, name);
            return metaPurse.withdrawAll(name);
          },
          redeem,
        });
        return contract(terms, inviteMaker);
      });
    },

    // If this is an invite payment made by an inviteMaker of this contract
    // host, redeem it for the associated seat. Else error. Redeeming
    // consumes the invite payment and also transfers the use rights.
    redeem(allegedInvitePaymentP) {
      return E.resolve(allegedInvitePaymentP).then(allegedInvitePayment => {
        return redeem(allegedInvitePayment);
      });
    },
  });
  return contractHost;
}
harden(makeContractHost);

function exchangeInviteAmount(
  inviteIssuerP,
  seatIdentityP,
  contractSrc,
  terms,
  seatIndex,
  giveAmount,
  takeAmount,
) {
  const passable = harden({
    label: {
      issuer: inviteIssuerP,
      description: 'contract host',
    },
    quantity: {
      label: {
        identity: seatIdentityP,
        description: {
          contractSrc,
          terms,
          seatDesc: [seatIndex, giveAmount, takeAmount],
        },
      },
      quantity: 1,
    },
  });
  const comparableP = allComparable(passable);
  /*
  E.resolve(comparableP).then(comparable =>
    console.log('\n####\n(', passable, ')\n####\n(', comparable, ')\n####\n'),
  );
  */
  return comparableP;
}
harden(exchangeInviteAmount);

function makeCollect(E, log) {
  function collect(seatP, winPurseP, refundPurseP, name = 'collecting') {
    const results = harden([
      E(seatP)
        .getWinnings()
        .then(winnings => E(winPurseP).depositAll(winnings)),
      // TODO Bug if replace the comma above with the uncommented out
      // ".then(_ => undefined)," below, somehow we end up trying to
      // marshal an array with holes, rather than an array with
      // undefined elements. This remains true whether we use
      // Promise.all or allSettled
      /* .then(_ => undefined), */
      E(seatP)
        .getRefund()
        .then(refund => refund && E(refundPurseP).depositAll(refund)),
    ]);
    const doneP = allSettled(results);
    E.resolve(doneP).then(([wins, refs]) => {
      log(`${name} wins: `, wins, ` refs: `, refs);
    });
    // Use Promise.all here rather than allSettled in order to
    // propagate rejection.
    return Promise.all(results);
  }
  return harden(collect);
}
harden(makeCollect);

export { makeContractHost, exchangeInviteAmount, makeCollect };
