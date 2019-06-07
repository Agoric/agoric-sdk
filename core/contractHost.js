// Copyright (C) 2019 Agoric, under Apache License 2.0

import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makePrivateName } from '../util/PrivateName';
import { allSettled } from '../util/allSettled';
import { insist } from '../util/insist';
import { mustBeSameStructure, allComparable } from '../util/sameStructure';
import { makeUniAssayMaker } from './assays';
import { makeMint } from './issuers';
import makePromise from '../util/makePromise';

function makeContractHost(E, evaluate) {
  // Maps from seat identity to seats
  const seats = makePrivateName();
  // from seat identity to invite description.
  const seatDescriptions = makePrivateName();
  // from installation to source code string
  const installationSources = makePrivateName();

  function descriptionCoercer(allegedDescription) {
    const seatDesc = seatDescriptions.get(allegedDescription.seatIdentity);
    mustBeSameStructure(seatDesc, allegedDescription);
    return seatDesc;
  }
  const makeUniAssay = makeUniAssayMaker(descriptionCoercer);
  const inviteMint = makeMint('contract host', makeUniAssay);
  const inviteIssuer = inviteMint.getIssuer();
  const inviteAssay = inviteIssuer.getAssay();

  function redeem(allegedInvitePayment) {
    const allegedInviteAmount = allegedInvitePayment.getBalance();
    const inviteAmount = inviteAssay.vouch(allegedInviteAmount);
    insist(!inviteAssay.isEmpty(inviteAmount))`\
No invites left`;
    const desc = inviteAssay.quantity(inviteAmount);
    const { seatIdentity } = desc;
    return E.resolve(
      inviteIssuer.slash(inviteAmount, allegedInvitePayment),
    ).then(_ => seats.get(seatIdentity));
  }

  // The contract host is designed to have a long-lived credible
  // identity.
  const contractHost = harden({
    getInviteIssuer() {
      return inviteIssuer;
    },

    // The `contractSrc` is code for a contract function parameterized
    // by `terms` and `inviteMaker`. `spawn` evaluates this code,
    // calls that function to start the contract, and returns whatever
    // the contract returns.
    //
    // TODO: The `spawn` method should spin off a new vat for each new
    // contract instance.  In the current single-vat implementation we
    // could evaluate the contractSrc to a contract during install
    // rather than spawn. However, once we spin off a new vat per
    // spawn, we'll need to evaluate per-spawn anyway. Even though we
    // do not save on evaluations, this currying enables us to avoid
    // re-sending the contract source code, and it enables us to use
    // the installation in descriptions rather than the source code
    // itself.
    install(contractSrc) {
      const installation = harden({
        spawn(termsP) {
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
              // participating in the contract. The returned invite
              // can be redeemed for this seat. The inviteMaker
              // contributes the description `{ installation, terms,
              // seatIdentity, seatDesc }`. If this contract host
              // redeems an invite, then the contractSrc and terms are
              // accurate. The seatDesc is according to that
              // contractSrc code.
              make(seatDesc, seat, name = 'an invite payment') {
                const seatIdentity = harden({});
                const seatDescription = harden({
                  installation,
                  terms,
                  seatIdentity,
                  seatDesc,
                });
                seats.init(seatIdentity, seat);
                seatDescriptions.init(seatIdentity, seatDescription);
                const inviteAmount = inviteAssay.make(seatDescription);
                // This should be the only use of the invite mint, to
                // make an invite purse whose quantity describes this
                // seat. This invite purse makes the invite payment,
                // and then the invite purse is dropped, in the sense
                // that it becomes inaccessible. But it is not yet
                // collectable. Until the returned invite payment is
                // deposited, it will retain the invite purse, as the
                // invite purse contains the (uselss in this case)
                // usage rights.
                const invitePurse = inviteMint.mint(inviteAmount, name);
                return invitePurse.withdrawAll(name);
              },
              redeem,
            });
            return contract(terms, inviteMaker);
          });
        },
      });
      installationSources.init(installation, contractSrc);
      return installation;
    },

    // Verify that this is a genuine installation and show its source
    // code. Thus, all genuine installations are transparent if one
    // has their contractHost.
    getInstallationSourceCode(installationP) {
      return E.resolve(installationP).then(installation =>
        installationSources.get(installation),
      );
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

function makeCollect(E, log) {
  function collect(seatP, winPurseP, refundPurseP, name = 'collecting') {
    const results = harden([
      E(seatP)
        .getWinnings()
        .then(winnings => E(winPurseP).depositAll(winnings)),
      // TODO Bug if we replace the comma above with the uncommented
      // out ".then(_ => undefined)," below, somehow we end up trying
      // to marshal an array with holes, rather than an array with
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

export { makeContractHost, makeCollect };
