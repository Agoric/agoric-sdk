// Copyright (C) 2019 Agoric, under Apache License 2.0

import { importBundle } from '@agoric/import-bundle';
import { makeWeakStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { allComparable } from '@agoric/same-structure';
import { Far } from '@agoric/marshal';
import { makeIssuerKit } from '@agoric/ertp';

export { makeCollect } from './makeCollect';

/*
 * Make a reusable host that can reliably install and execute contracts.
 *
 * @param E eventual-send method proxy
 * @param evaluate function to evaluate with endowments
 * @param additionalEndowments pure or pure-ish endowments to add to evaluator
 */
function makeContractHost(vatPowers, additionalEndowments = {}) {
  // To enforce metering, vatPowers must provide makeGetMeter and
  // transformMetering. These will come from arguments passed to the vat's
  // buildRoot function.

  // Maps from seat identity to seats
  const seats = makeWeakStore('seatIdentity');
  // from seat identity to invite description.
  const seatDescriptions = makeWeakStore('seatIdentity');
  // from installation to source code bundle
  const installationSourceBundles = makeWeakStore('installation');

  const {
    mint: inviteMint,
    issuer: inviteIssuer,
    amountMath: inviteAmountMath,
  } = makeIssuerKit('contract host', 'set');

  function redeem(allegedInvitePayment) {
    return inviteIssuer.getAmountOf(allegedInvitePayment).then(inviteAmount => {
      assert(!inviteAmountMath.isEmpty(inviteAmount), X`No invites left`);
      const [{ seatIdentity }] = inviteAmountMath.getValue(inviteAmount);
      return Promise.resolve(
        inviteIssuer.burn(allegedInvitePayment, inviteAmount),
      ).then(_ => seats.get(seatIdentity));
    });
  }

  const defaultEndowments = {
    console,
    assert,
  };

  // note: support for check functions was removed during warner's
  // new-SES-ification, there were no (enabled) tests to exercise them. The
  // comments that talk about special treatment of 'check' functions should
  // be treated with suspicion.

  // TODO: We'd like to have fail-stop semantics, which means we associate a
  // meter with a spawn and not with an installation, and failed spawns die
  // forever. Check functions, on the other hand, should be billed to the
  // installation, which may die forever.

  /** The contract host is designed to have a long-lived credible identity. */
  const contractHost = Far('contractHost', {
    getInvitationIssuer() {
      return inviteIssuer;
    },
    // contractBundle is a record containing source code for the functions
    // comprising a contract, as created by bundle-source. `spawn` evaluates
    // the `start` function (parameterized by `terms` and `inviteMaker`) to
    // start the contract, and returns whatever the contract returns. The
    // contract can also have any number of functions with names beginning
    // 'check', each of which can be used by clients to help validate that
    // they have terms that match the contract.

    // TODO: we have 2 or 3 dapps (in separate repos) which do { source,
    // moduleFormat } = bundleSource(..), then E(spawner).install(source,
    // moduleFormat). Those will get the default
    // moduleFormat="nestedEvaluate". We need to support those callers, even
    // though our new preferred API is just install(bundle). We also look for
    // getExport because that's easier to create in the unit tests.
    //
    // TODO: once we've ugpraded and released all the dapps, consider
    // removing this backwards-compatibility feature.

    install(contractBundle, oldModuleFormat = undefined) {
      if (
        oldModuleFormat === 'nestedEvaluate' ||
        oldModuleFormat === 'getExport'
      ) {
        contractBundle = harden({
          source: contractBundle,
          moduleFormat: oldModuleFormat,
        });
      }

      const installation = {};

      // TODO: The `spawn` method should spin off a new vat for each new
      // contract instance.  In the current single-vat implementation we
      // evaluate the contract's start function during install rather than
      // spawn. Once we spin off a new vat per spawn, we'll need to evaluate it
      // per-spawn. Even though we do not save on evaluations, this currying
      // enables us to avoid (for now) re-sending the contract source code, and
      // it enables us to use the installation in descriptions rather than the
      // source code itself. The check... methods must be evaluated on install,
      // since they become properties of the installation.

      async function spawn(termsP) {
        // we create new meteringEndowments here, so each spawn gets a
        // separate meter

        const transforms = [];
        const meteringEndowments = {};
        if (
          vatPowers &&
          vatPowers.transformMetering &&
          vatPowers.makeGetMeter
        ) {
          const { makeGetMeter, transformMetering } = vatPowers;
          // This implements fail-stop, since a contract that exhausts the meter
          // will not run again.
          const { getMeter } = makeGetMeter({ refillIfExhausted: false });
          transforms.push(src => transformMetering(src, getMeter));
          meteringEndowments.getMeter = getMeter;
        }

        const fullEndowments = Object.create(null, {
          ...Object.getOwnPropertyDescriptors(defaultEndowments),
          ...Object.getOwnPropertyDescriptors(additionalEndowments),
          ...Object.getOwnPropertyDescriptors(meteringEndowments),
        });

        const ns = await importBundle(contractBundle, {
          endowments: fullEndowments,
          transforms,
        });
        const startFn = ns.default;

        return Promise.resolve(allComparable(termsP)).then(terms => {
          const inviteMaker = Far('inviteMaker', {
            // Used by the contract to make invites for credibly
            // participating in the contract. The returned invite
            // can be redeemed for this seat. The inviteMaker
            // contributes the description `{ installation, terms,
            // seatIdentity, seatDesc }`. If this contract host
            // redeems an invite, then the contractSrc and terms are
            // accurate. The seatDesc is according to that
            // contractSrc code.
            make(seatDesc, seat) {
              const seatIdentity = Far('seat', {});
              const seatDescription = harden([
                {
                  installation,
                  terms,
                  seatIdentity,
                  seatDesc,
                },
              ]);
              seats.init(seatIdentity, seat);
              seatDescriptions.init(seatIdentity, seatDescription);
              const inviteAmount = inviteAmountMath.make(seatDescription);
              // This should be the only use of the invite mint, to
              // make an invite payment whose value describes this
              // seat.
              return inviteMint.mintPayment(inviteAmount);
            },
            redeem,
          });
          return startFn(terms, inviteMaker);
        });
      }

      installation.spawn = spawn;
      Far('installation', installation);
      installationSourceBundles.init(installation, contractBundle);
      return installation;
    },

    // Verify that this is a genuine installation and show its source code
    // bundle. Thus, all genuine installations are transparent if one has
    // their contractHost.
    getInstallationSourceBundle(installationP) {
      return Promise.resolve(installationP).then(installation =>
        installationSourceBundles.get(installation),
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

export { makeContractHost };
