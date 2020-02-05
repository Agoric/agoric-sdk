// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import makeStore from '@agoric/store';
import { assert, details } from '@agoric/assert';
import { allComparable } from '@agoric/same-structure';
import { inviteConfig } from '@agoric/ertp/src/config/inviteConfig';
import { makeMint } from '@agoric/ertp';
import { allSettled } from './allSettled';

/**
 * Make a reusable host that can reliably install and execute contracts.
 *
 * @param E eventual-send method proxy
 * @param evaluate function to evaluate with endowments
 * @param adminVat the adminVat for executing contracts in vats
 */
function makeContractHost(E, evaluate, adminVat) {
  // Maps from seat identity to seats
  const seats = makeStore('seatIdentity');
  // from seat identity to invite description.
  const seatDescriptions = makeStore('seatIdentity');
  // from installation to source code string
  const installationSources = makeStore('installation');

  const inviteMint = makeMint('contract host', inviteConfig);
  const inviteAssay = inviteMint.getAssay();
  const inviteUnitOps = inviteAssay.getUnitOps();

  function redeem(allegedInvitePayment) {
    const allegedInviteUnits = allegedInvitePayment.getBalance();
    const inviteUnits = inviteUnitOps.coerce(allegedInviteUnits);
    assert(!inviteUnitOps.isEmpty(inviteUnits), details`No invites left`);
    const { seatIdentity } = inviteUnitOps.extent(inviteUnits);
    return Promise.resolve(
      inviteAssay.burnExactly(inviteUnits, allegedInvitePayment),
    ).then(_ => seats.get(seatIdentity));
  }

  /** The contract host is designed to have a long-lived credible identity. */
  const contractHost = harden({
    getInviteAssay() {
      return inviteAssay;
    },
    // contractSrcs is a record containing source code for the functions
    // comprising a contract. `spawn` evaluates the `start` function
    // (parameterized by `terms` and `inviteMaker`) to start the contract, and
    // returns whatever the contract returns. The contract can also have any
    // number of functions with names beginning 'check', each of which can be
    // used by clients to help validate that they have terms that match the
    // contract.
    install(contractSrcs, moduleFormat = 'object') {
      const installation = harden({
        // spawn() spins up a new vat for each new contract instance. There is
        // one installation object per contract object, which represents the
        // contract in seatDescriptions, and is known to and verifiable by
        // contractHost itself.
        spawn(termsP) {
          insist(moduleFormat === 'module')`Module format is required in vats`;
          const startFnP = E(adminVat).createVat(contractSrcs);
          return Promise.resolve(allComparable(termsP)).then(terms => {
            const inviteMaker = harden({
              // Used by the contract to make invites for credibly participating
              // in the contract. The returned invite can be redeemed for this
              // seat. The inviteMaker contributes the description
              // `{ installation, terms, seatIdentity, seatDesc }`. If this
              // contract host redeems an invite, then the contractSrc and terms
              // are accurate. The seatDesc is according to that contractSrc.
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
                const inviteUnits = inviteUnitOps.make(seatDescription);
                // This should be the only use of the invite mint, to
                // make an invite purse whose extent describes this
                // seat. This invite purse makes the invite payment,
                // and then the invite purse is dropped, in the sense
                // that it becomes inaccessible.
                const invitePurse = inviteMint.mint(inviteUnits, name);
                return invitePurse.withdrawAll(name);
              },
              redeem,
            });
            return startFnP.then(({ root, adminNode }) => {
              const rootObject = E(root).start(terms, inviteMaker);
              return harden({ rootObject, adminNode });
            });
          });
        },
      });

      harden(installation);
      installationSources.init(installation, contractSrcs);
      return installation;
    },

    // Verify that this is a genuine installation and show its source
    // code. Thus, all genuine installations are transparent if one
    // has their contractHost.
    getInstallationSourceCode(installationP) {
      return Promise.resolve(installationP).then(installation =>
        installationSources.get(installation),
      );
    },

    // If this is an invite payment made by an inviteMaker of this contract
    // host, redeem it for the associated seat. Else error. Redeeming
    // consumes the invite payment and also transfers the use rights.
    redeem(allegedInvitePaymentP) {
      return Promise.resolve(allegedInvitePaymentP).then(
        allegedInvitePayment => {
          return redeem(allegedInvitePayment);
        },
      );
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
    Promise.resolve(doneP).then(([wins, refs]) => {
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
