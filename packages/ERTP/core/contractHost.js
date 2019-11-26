// Copyright (C) 2019 Agoric, under Apache License 2.0

import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makePrivateName } from '../util/PrivateName';
import { allSettled } from '../util/allSettled';
import { insist } from '../util/insist';
import {
  allComparable,
  mustBeSameStructure,
  sameStructure,
} from '../util/sameStructure';
import { makeInviteConfig } from './config/inviteConfig';
import { makeMint } from './mint';
import makePromise from '../util/makePromise';

/**
 * Make a reusable host that can reliably install and execute contracts.
 *
 * @param E eventual-send method proxy
 * @param evaluate function to evaluate with endowments
 * @param additionalEndowments pure or pure-ish endowments to add to evaluator
 */
function makeContractHost(E, evaluate, additionalEndowments = {}) {
  // Maps from seat identity to seats
  const seats = makePrivateName();
  // from seat identity to invite description.
  const seatDescriptions = makePrivateName();
  // from installation to source code string
  const installationSources = makePrivateName();

  const inviteMint = makeMint('contract host', makeInviteConfig);
  const inviteAssay = inviteMint.getAssay();
  const inviteUnitOps = inviteAssay.getUnitOps();

  function redeem(allegedInvitePayment) {
    const allegedInviteUnits = allegedInvitePayment.getBalance();
    const inviteUnits = inviteUnitOps.coerce(allegedInviteUnits);
    insist(!inviteUnitOps.isEmpty(inviteUnits))`\
No invites left`;
    const { seatIdentity } = inviteUnitOps.extent(inviteUnits);
    return Promise.resolve(
      inviteAssay.burnExactly(inviteUnits, allegedInvitePayment),
    ).then(_ => seats.get(seatIdentity));
  }

  const defaultEndowments = {
    Nat,
    harden,
    console,
    E,
    makePromise,
    // TODO: sameStructure is used in one check...() function. Figure out a
    // more general approach to providing useful helpers.
    // The best approach is to use the `getExport` moduleFormat, and
    // bundle imported modules that implement the things we want to use.
    sameStructure,
    mustBeSameStructure,
  };
  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
  });

  function evaluateStringToFn(functionSrcString) {
    insist(typeof functionSrcString === 'string')`\n
"${functionSrcString}" must be a string, but was ${typeof functionSrcString}`;
    const fn = evaluate(functionSrcString, fullEndowments);
    insist(typeof fn === 'function')`\n
"${functionSrcString}" must be a string for a function, but produced ${typeof fn}`;
    return fn;
  }

  /**
   * Build an object containing functions with names starting with 'check' from
   * strings in the input contract.
   */
  function extractCheckFunctions(contractSrcs) {
    const installation = {};
    for (const fname of Object.getOwnPropertyNames(contractSrcs)) {
      if (typeof fname === 'string' && fname.startsWith('check')) {
        const fn = evaluateStringToFn(contractSrcs[fname]);
        installation[fname] = (...args) => fn(installation, ...args);
      }
    }
    return installation;
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
      let installation;
      let startFn;
      if (moduleFormat === 'object') {
        installation = extractCheckFunctions(contractSrcs);
        startFn = evaluateStringToFn(contractSrcs.start);
      } else if (moduleFormat === 'getExport') {
        const getExports = evaluateStringToFn(contractSrcs);
        const ns = getExports();
        installation = {};
        for (const fname of Object.getOwnPropertyNames(ns)) {
          if (typeof fname === 'string' && fname.startsWith('check')) {
            const fn = ns[fname];
            installation[fname] = (...args) => fn(installation, ...args);
          }
        }
        startFn = ns.default;
      } else {
        insist(false)`\
Unrecognized moduleFormat ${moduleFormat}`;
      }

      // TODO: The `spawn` method should spin off a new vat for each new
      // contract instance.  In the current single-vat implementation we
      // evaluate the contract's start function during install rather than
      // spawn. Once we spin off a new vat per spawn, we'll need to evaluate it
      // per-spawn. Even though we do not save on evaluations, this currying
      // enables us to avoid (for now) re-sending the contract source code, and
      // it enables us to use the installation in descriptions rather than the
      // source code itself. The check... methods must be evaluated on install,
      // since they become properties of the installation.
      function spawn(termsP) {
        return Promise.resolve(allComparable(termsP)).then(terms => {
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
          return startFn(terms, inviteMaker);
        });
      }

      installation.spawn = spawn;
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
