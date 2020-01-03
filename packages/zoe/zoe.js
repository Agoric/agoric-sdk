import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import { insist } from '@agoric/ertp/util/insist';
import makePromise from '@agoric/ertp/util/makePromise';
import { makePrivateName } from '@agoric/ertp/util/PrivateName';
import { makeMint } from '@agoric/ertp/core/mint';

import { isOfferSafeForAll } from './isOfferSafe';
import { areRightsConserved } from './areRightsConserved';
import { evalContractCode } from './evalContractCode';
import { makeTables } from './state';
import { makeInviteConfig } from './inviteConfig';

/**
 * Create an instance of Zoe.
 *
 * @param additionalEndowments pure or pure-ish endowments to add to evaluator
 */
const makeZoe = (additionalEndowments = {}) => {
  // Zoe maps the inviteHandles to contract seats
  const handleToSeat = makePrivateName();
  const inviteMint = makeMint('zoeInvite', makeInviteConfig);
  const inviteAssay = inviteMint.getAssay();

  // All of the Zoe state is stored in these tables built on WeakMaps
  const {
    installationTable,
    instanceTable,
    offerTable,
    payoutMap,
    assayTable,
  } = makeTables();

  // Helper functions
  const getAssaysFromPayoutRules = payoutRules =>
    payoutRules.map(payoutRule => payoutRule.units.label.assay);

  const depositPayments = (
    offerRules,
    offerPayments,
    instanceHandle,
    offerHandle = undefined,
  ) => {
    const assays = getAssaysFromPayoutRules(offerRules.payoutRules);

    // Promise flow = assay -> purse -> deposit payment -> escrow receipt
    const paymentDepositedPs = assays.map((assay, i) => {
      const assayRecordP = assayTable.getPromiseForAssayRecord(assay);
      const payoutRule = offerRules.payoutRules[i];
      const offerPayment = offerPayments[i];

      return assayRecordP.then(({ purse, unitOps }) => {
        if (payoutRule.kind === 'offerAtMost') {
          // We cannot trust these units since they come directly
          // from the remote assay and must coerce them.
          return E(purse)
            .depositExactly(payoutRule.units, offerPayment)
            .then(units => unitOps.coerce(units));
        }
        insist(
          offerPayments[i] === undefined,
        )`payment was included, but the rule kind was ${payoutRule.kind}`;
        return Promise.resolve(unitOps.empty());
      });
    });

    return Promise.all(paymentDepositedPs).then(unitsArray => {
      const offerImmutableRecord = {
        instanceHandle,
        payoutRules: offerRules.payoutRules,
        exitRule: offerRules.exitRule,
        assays,
        units: unitsArray,
      };
      // If we have redeemed an invite, the inviteHandle is the offerHandle
      offerHandle = offerTable.create(offerImmutableRecord, offerHandle);
      payoutMap.init(offerHandle, makePromise());
      return offerHandle;
    });
  };

  // In the future, this function will take `offerHandles` and
  // `assays` as parameters.
  const completeOffers = offerHandles => {
    const { inactive } = offerTable.getOfferStatuses(offerHandles);
    if (inactive.length > 0) {
      throw new Error(`offer has already completed`);
    }
    const offers = offerTable.getOffers(offerHandles);

    // In the future, when `assays` is a parameter, the next
    // line can be deleted
    const assays = getAssaysFromPayoutRules(offers[0].payoutRules);

    // Remove the offers from the offerTable so that they are no
    // longer active.
    offerTable.deleteOffers(offerHandles);

    // Resolve the payout promises with the payouts
    const pursePs = assayTable.getPursesForAssays(assays);
    for (const offer of offers) {
      // This Promise.all will be taken out in a later PR. The
      // resolution of the promise for the payouts should instead
      // fulfill to indicate promptly that the player has been ejected
      // from Zoe, rather than have it wait for all issuers (which btw
      // Zoe doesn't trust) to complete these withdrawals.
      const payout = Promise.all(
        offer.units.map((units, j) => E(pursePs[j]).withdraw(units, 'payout')),
      );
      payoutMap.get(offer.handle).res(payout);
    }
  };

  // Make a Zoe invite with an extent that is a mix of credible
  // information from Zoe (the `handle` and `instanceHandle`) and
  // other information defined by the smart contract. Note that the
  // smart contract cannot override or change the values of `handle`
  // and `instanceHandle`.
  const makeInvite = (instanceHandle, seat, customProperties = harden({})) => {
    const inviteHandle = harden({});
    const inviteUnits = inviteAssay.makeUnits(
      harden({
        ...customProperties,
        handle: inviteHandle,
        instanceHandle,
      }),
    );
    handleToSeat.init(inviteHandle, seat);
    const purse = inviteMint.mint(inviteUnits);
    const invitePayment = purse.withdrawAll();
    return harden({ invite: invitePayment, inviteHandle });
  };

  // Zoe has two different facets: the public Zoe service and the
  // contract facet. The contract facet is what is accessible to the
  // smart contract instance and is remade for each instance. The
  // contract at no time has access to the users' payments or the Zoe
  // purses. The contract can only do a few things through the Zoe
  // contract facet. It can propose a reallocation of units,
  // complete an offer, and can create a new offer itself for
  // record-keeping and other various purposes.

  const makeContractFacet = instanceHandle => {
    const contractFacet = harden({
      /**
       * The contract can propose a reallocation of extents per
       * offer, which will only succeed if the reallocation 1)
       * conserves rights, and 2) is 'offer-safe' for all parties
       * involved. This reallocation is partial, meaning that it
       * applies only to the units associated with the offerHandles
       * that are passed in. We are able to ensure that with
       * each reallocation, rights are conserved and offer safety is
       * enforced for all offers, even though the reallocation is
       * partial, because once these invariants are true, they will
       * remain true until changes are made.
       * @param  {object[]} offerHandles - an array of offerHandles
       * @param  {unit[][]} newUnitMatrix - a matrix of units, with
       * one array of units per offerHandle.
       */
      reallocate: (offerHandles, newUnitMatrix) => {
        const { assays } = instanceTable.get(instanceHandle);

        const offers = offerTable.getOffers(offerHandles);

        const payoutRuleMatrix = offers.map(offer => offer.payoutRules);
        const currentUnitMatrix = offers.map(offer => offer.units);
        const unitOpsArray = assayTable.getUnitOpsForAssays(assays);

        // 1) ensure that rights are conserved
        insist(
          areRightsConserved(unitOpsArray, currentUnitMatrix, newUnitMatrix),
        )`Rights are not conserved in the proposed reallocation`;

        // 2) ensure 'offer safety' for each player
        insist(
          isOfferSafeForAll(unitOpsArray, payoutRuleMatrix, newUnitMatrix),
        )`The proposed reallocation was not offer safe`;

        // 3) save the reallocation
        offerTable.updateUnitMatrix(offerHandles, newUnitMatrix);
      },

      /**
       * The contract can "complete" an offer to remove it from the
       * ongoing contract and resolve the player's payouts (either
       * winnings or refunds). Because Zoe only allows for
       * reallocations that conserve rights and are 'offer-safe', we
       * don't need to do those checks at this step and can assume
       * that the invariants hold.
       * @param  {object[]} offerHandles - an array of offerHandles
       */
      complete: completeOffers,

      /**
       * Make a credible Zoe invite for a particular smart contract
       * indicated by the unique `instanceHandle`. The other
       * information in the extent of this invite is decided by the
       * governing contract and should include whatever information is
       * necessary for a potential buyer of the invite to know what
       * they are getting. Note: if information can be derived in
       * queries based on other information, we choose to omit it. For
       * instance, `installationHandle` can be derived from
       * `instanceHandle` and is omitted even though it is useful.
       * @param  {object} seat - an object defined by the smart
       * contract that is the use right associated with the invite. In
       * other words, buying the invite is buying the right to call
       * methods on this object.
       * @param  {object} customProperties - an object of
       * information to include in the extent, as defined by the smart
       * contract
       */
      makeInvite: (seat, customProperties) =>
        makeInvite(instanceHandle, seat, customProperties),
      getInviteAssay: () => inviteAssay,

      // informs Zoe about an assay and returns a promise for the
      // assay record
      addAssays: assays => assayTable.getPromiseForAssayRecords(assays),

      getUnitOpsForAssays: assayTable.getUnitOpsForAssays,
      getOfferStatuses: offerTable.getOfferStatuses,
      isOfferActive: offerTable.isOfferActive,
      getOffers: offerTable.getOffers,
      getOffer: offerTable.get,

      // eslint-disable-next-line no-use-before-define
      getZoeService: () => zoeService,
    });
    return contractFacet;
  };

  // The public Zoe service has four main methods: `install` takes
  // contract code and registers it with Zoe associated with an
  // `installationHandle` for identification, `makeInstance` creates
  // an instance from an installation, `getInstance` credibly
  // retrieves an instance from Zoe, and `escrow` allows users to
  // securely escrow and get an escrow receipt and payouts in return.

  const zoeService = harden({
    getInviteAssay: () => inviteAssay,

    /**
     * Create an installation by safely evaluating the code and
     * registering it with Zoe. We have a moduleFormat to allow for
     * different future formats without silent failures.
     */
    install: (code, moduleFormat = 'getExport') => {
      let installation;
      switch (moduleFormat) {
        case 'getExport': {
          installation = evalContractCode(code, additionalEndowments);
          break;
        }
        default: {
          insist(false)`\
Unimplemented installation moduleFormat ${moduleFormat}`;
        }
      }
      const installationHandle = installationTable.create(
        harden({ installation }),
      );
      return installationHandle;
    },

    /**
     * Makes a contract instance from an installation and returns a
     * unique handle for the instance that can be shared, as well as
     * other information, such as the terms used in the instance.
     * @param  {object} installationHandle - the unique handle for the
     * installation
     * @param  {object} terms - arguments to the contract. These
     * arguments depend on the contract, apart from the `assays`
     * property, which is required.
     */
    makeInstance: (installationHandle, terms) => {
      const { installation } = installationTable.get(installationHandle);
      const instanceHandle = harden({});
      const contractFacet = makeContractFacet(instanceHandle);

      const makeContractInstance = assayRecords => {
        const synchronousTerms = {
          ...terms,
          assays: assayRecords.map(record => record.assay),
        };
        return installation.makeContract(contractFacet, synchronousTerms);
      };

      const storeContractInstance = ({
        invite,
        publicAPI,
        terms: contractTerms,
      }) => {
        return assayTable
          .getPromiseForAssayRecords(contractTerms.assays)
          .then(assayRecords => {
            const finalAssays = assayRecords.map(record => record.assay);

            const finalTerms = {
              ...terms,
              assays: finalAssays,
            };

            const instanceRecord = harden({
              installationHandle,
              publicAPI,
              assays: finalAssays,
              terms: finalTerms,
            });

            instanceTable.create(instanceRecord, instanceHandle);
            return invite;
          });
      };

      // The assays may not have been seen before, so we must wait for
      // the assay records to be available synchronously
      return assayTable
        .getPromiseForAssayRecords(terms.assays)
        .then(makeContractInstance)
        .then(storeContractInstance);
    },
    /**
     * Credibly retrieves an instance record given an instanceHandle.
     * @param {object} instanceHandle - the unique, unforgeable
     * identifier (empty object) for the instance
     */
    getInstance: instanceTable.get,

    /**
     * Redeem the invite to receive a seat and a payout
     * promise.
     * @param {payment} invite - an invite (ERTP payment) to join a
     * Zoe smart contract instance
     * @param  {offerRule[]} offerRules - the offer rules, an object
     * with properties `payoutRules` and `exitRule`.
     * @param  {payment[]} offerPayments - payments corresponding to
     * the offer rules. A payment may be `undefined` in the case of
     * specifying a `wantAtLeast`.
     */
    redeem: (invite, offerRules, offerPayments) => {
      // Create result to be returned. Depends on exitRule
      const makeRedemptionResult = offerHandle => {
        const redemptionResult = {
          seat: handleToSeat.get(offerHandle),
          payout: payoutMap.get(offerHandle).p,
        };
        const { exitRule } = offerRules;
        // Automatically cancel on deadline.
        if (exitRule.kind === 'afterDeadline') {
          E(exitRule.timer).setWakeup(
            exitRule.deadline,
            harden({
              wake: () => completeOffers(harden([offerHandle])),
            }),
          );
        }

        // Add an object with a cancel method to redemptionResult in
        // order to cancel on demand.
        if (exitRule.kind === 'onDemand') {
          redemptionResult.cancelObj = {
            cancel: () => completeOffers(harden([offerHandle])),
          };
        }

        // if the exitRule.kind is 'waived' the user has no
        // possibility of cancelling
        return harden(redemptionResult);
      };

      const getHandlesAndDepositPayments = units => {
        const { instanceHandle, handle } = units.extent;
        // the invite handle is reused as the offer handle
        return depositPayments(
          offerRules,
          offerPayments,
          instanceHandle,
          handle,
        );
      };

      return inviteAssay
        .burnAll(invite)
        .then(getHandlesAndDepositPayments)
        .then(makeRedemptionResult);
    },
  });
  return zoeService;
};

export { makeZoe };
