import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import { insist } from '@agoric/ertp/util/insist';
import makePromise from '@agoric/ertp/util/makePromise';
import { makeMint } from '@agoric/ertp/core/mint';

import { isOfferSafeForAll } from './isOfferSafe';
import { areRightsConserved } from './areRightsConserved';
import { evalContractCode } from './evalContractCode';

import { makeTables } from './state';
import { makeSeatMint } from './seatMint';
import { makeEscrowReceiptConfig } from './escrowReceiptConfig';

const getAssaysFromPayoutRules = payoutRules =>
  payoutRules.map(payoutRule => payoutRule.units.label.assay);

/**
 * Create an instance of Zoe.
 *
 * @param additionalEndowments pure or pure-ish endowments to add to evaluator
 */
const makeZoe = (additionalEndowments = {}) => {
  // Zoe has two mints: a mint for invites and a mint for
  // escrowReceipts. The invite mint can be used by a smart contract
  // to create invites to take certain actions in the smart contract.
  // An escrowReceipt is an ERTP payment that is proof of
  // escrowing assets with Zoe.
  const {
    seatMint: inviteMint,
    seatAssay: inviteAssay,
    addUseObj: addInviteSeat,
  } = makeSeatMint('zoeInvite');

  const escrowReceiptMint = makeMint(
    'zoeEscrowReceipts',
    makeEscrowReceiptConfig,
  );
  const escrowReceiptAssay = escrowReceiptMint.getAssay();
  const {
    installationTable,
    instanceTable,
    offerTable,
    assayTable,
  } = makeTables();

  const completeOffers = offerHandles => {
    const { inactive } = offerTable.getOfferStatuses(offerHandles);
    if (inactive.length > 0) {
      throw new Error(`offer has already completed`);
    }
    // For backwards compatibility, we retain this function signature
    // and try to derive the assays from the first offerHandle. In the
    // future, this function will take `offerHandles` and `assays` as parameters.
    const payoutRules = offerTable.getPayoutRules(offerHandles[0]);
    const assays = getAssaysFromPayoutRules(payoutRules);
    const unitMatrix = offerTable.getUnitMatrix(offerHandles, assays);
    const payoutPromises = offerTable.getPayoutPromises(offerHandles);
    offerTable.deleteOffers(offerHandles);
    const pursesP = assayTable.getPursesForAssays(assays);
    Promise.all(pursesP).then(purses => {
      for (let i = 0; i < offerHandles.length; i += 1) {
        const unitsForOffer = unitMatrix[i];
        // This Promise.all will be taken out in a later PR.
        const payout = Promise.all(
          unitsForOffer.map((units, j) =>
            E(purses[j]).withdraw(units, 'payout'),
          ),
        );
        payoutPromises[i].res(payout);
      }
    });
  };

  const makeEmptyPayoutRules = unitOpsArray =>
    unitOpsArray.map(unitOps =>
      harden({
        kind: 'wantAtLeast',
        units: unitOps.empty(),
      }),
    );

  const makeInvite = (
    instanceHandle,
    seat,
    contractDefinedExtent = harden({}),
  ) => {
    const inviteHandle = harden({});
    const inviteUnits = inviteAssay.makeUnits(
      harden({
        ...contractDefinedExtent,
        handle: inviteHandle,
        instanceHandle,
      }),
    );
    const invitePurse = inviteMint.mint(inviteUnits);
    addInviteSeat(inviteHandle, seat);
    const invitePayment = invitePurse.withdrawAll();
    return invitePayment;
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
       * The contract can propose a reallocation of units per
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
       * @param  {assay[]} assays - the canonical ordering of assays
       * for this reallocation. The units in each newUnitMatrix row
       * will be in this order.
       * @param  {unit[][]} newUnitMatrix - a matrix of units, with
       * one array of units per offerHandle.
       */
      reallocate: (offerHandles, newExtentMatrix) => {
        const { assays } = instanceTable.get(instanceHandle);

        const payoutRuleMatrix = offerTable.getPayoutRuleMatrix(
          offerHandles,
          assays,
        );
        const currentExtentMatrix = offerTable.getExtentMatrix(
          offerHandles,
          assays,
        );
        const extentOpsArray = assayTable.getExtentOpsForAssays(assays);

        // 1) ensure that rights are conserved
        insist(
          areRightsConserved(
            extentOpsArray,
            currentExtentMatrix,
            newExtentMatrix,
          ),
        )`Rights are not conserved in the proposed reallocation`;

        // 2) ensure 'offer safety' for each player
        insist(
          isOfferSafeForAll(extentOpsArray, payoutRuleMatrix, newExtentMatrix),
        )`The proposed reallocation was not offer safe`;

        // 3) save the reallocation
        // for backwards compatibility, we update extents and units
        offerTable.updateExtentMatrix(offerHandles, newExtentMatrix);
        const unitOpsArray = assayTable.getUnitOpsForAssays(assays);
        const newUnitMatrix = newExtentMatrix.map(extentsRow =>
          extentsRow.map((extent, i) => unitOpsArray[i].make(extent)),
        );
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

      escrowEmptyOffer: () => {
        const { assays } = instanceTable.get(instanceHandle);
        const offerHandle = harden({});
        const unitOpsArray = assayTable.getUnitOpsForAssays(assays);
        const extentOpsArray = assayTable.getExtentOpsForAssays(assays);
        const offerImmutableRecord = {
          instanceHandle,
          payoutRules: makeEmptyPayoutRules(unitOpsArray),
          exitRule: { kind: 'onDemand' },
          assays,
          units: unitOpsArray.map(unitOps => unitOps.empty()),
          extents: extentOpsArray.map(extentOps => extentOps.empty()),
          payoutPromise: makePromise(),
        };
        offerTable.create(offerHandle, offerImmutableRecord);
        return offerHandle;
      },

      escrowOffer: (offerRules, offerPayments) => {
        const { assays } = instanceTable.get(instanceHandle);
        const offerHandle = harden({});
        const offerImmutableRecord = {
          instanceHandle,
          payoutRules: offerRules.payoutRules, // use makeEmptyPayoutRules
          exitRule: offerRules.exitRule,
          assays,
          payoutPromise: makePromise(),
          units: undefined,
          extents: undefined,
        };
        offerTable.create(offerHandle, offerImmutableRecord);

        // Promise flow = assay -> purse -> deposit payment -> record units
        const paymentBalancesP = assays.map((assay, i) => {
          const { purseP, unitOpsP } = assayTable.getOrCreateAssay(assay);
          const offerPayment = offerPayments[i];

          return Promise.all([purseP, unitOpsP]).then(([purse, unitOps]) => {
            if (offerPayment !== undefined) {
              // We cannot trust these units since they come directly
              // from the remote assay and must coerce them.
              return E(purse)
                .depositAll(offerPayment)
                .then(units => unitOps.coerce(units));
            }
            return Promise.resolve(unitOps.empty());
          });
        });
        const allDepositedP = Promise.all(paymentBalancesP);
        return allDepositedP
          .then(unitsArray => {
            const extentsArray = unitsArray.map(units => units.extent);
            offerTable.update(offerHandle, {
              units: unitsArray,
              extents: extentsArray,
            });
          })
          .then(_ => offerHandle);
      },

      burnEscrowReceipt: async escrowReceipt => {
        const units = await escrowReceiptAssay.burnAll(escrowReceipt);
        const { offerHandle } = units.extent;
        if (!offerTable.isOfferActive(offerHandle)) {
          return Promise.reject(new Error('offer was cancelled'));
        }
        offerTable.recordUsedInInstance(offerHandle, instanceHandle);
        return units.extent;
      },

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
       * @param  {object} contractDefinedExtent - an object of
       * information to include in the extent, as defined by the smart
       * contract
       * @param  {object} useObj - an object defined by the smart
       * contract that is the use right associated with the invite. In
       * other words, buying the invite is buying the right to call
       * methods on this object.
       */
      makeInvite: (inviteExtent, seat) =>
        makeInvite(instanceHandle, seat, inviteExtent),
      getInviteAssay: () => inviteAssay,
      getPayoutRuleMatrix: offerTable.getPayoutRuleMatrix,
      getUnitOpsForAssays: assayTable.getUnitOpsForAssays,
      getOfferStatuses: offerTable.getOfferStatuses,
      getUnitMatrix: offerTable.getUnitMatrix,

      // for a particular offer
      getPayoutRules: offerTable.getPayoutRules,
      getExitRule: offerTable.getExitRule,
      isOfferActive: offerTable.isOfferActive,

      // backwards compatible methods, to be deprecated
      getStatusFor: offerTable.getOfferStatuses,
      getExtentsFor: offerTable.getExtentsFor,
      getExtentOpsArray: () => {
        const { assays } = instanceTable.get(instanceHandle);
        return assayTable.getExtentOpsForAssays(assays);
      },
      getPayoutRulesFor: offerTable.getPayoutRuleMatrix,
      makeEmptyExtents: () => {
        const { assays } = instanceTable.get(instanceHandle);
        const extentOpsArray = assayTable.getExtentOpsForAssays(assays);
        return extentOpsArray.map(extentOps => extentOps.empty());
      },
      getLabels: () => {
        const { assays } = instanceTable.get(instanceHandle);
        return assayTable.getLabelsForAssays(assays);
      },
    });
    return contractFacet;
  };

  // The public Zoe service has four main methods: `install` takes
  // contract code and registers it with Zoe associated with an
  // `installationHandle` for identification, `makeInstance` creates
  // an instance from an installation, `getInstance` credibly
  // retrieves an instance from zoe, and `escrow` allows users to
  // securely escrow and get an escrow receipt and payouts in return.

  const zoeService = harden({
    getInviteAssay: () => inviteAssay,
    getEscrowReceiptAssay: () => escrowReceiptAssay,
    // backwards compatibility
    getAssaysForInstance: instanceHandle =>
      instanceTable.get(instanceHandle).assays,
    /**
     * Create an installation by safely evaluating the code and
     * registering it with Zoe.
     */
    install: code => {
      const installation = evalContractCode(code, additionalEndowments);
      const installationHandle = harden({});
      const { handle } = installationTable.create(
        installationHandle,
        harden({ installation }),
      );
      return handle;
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
    makeInstance: (installationHandle, userDefinedTerms) => {
      const { installation } = installationTable.get(installationHandle);
      const instanceHandle = harden({});
      const contractFacet = makeContractFacet(instanceHandle);
      const { instance, assays } = installation.makeContract(
        contractFacet,
        userDefinedTerms,
      );

      const terms = {
        ...userDefinedTerms,
        assays,
      };
      const instanceRecord = harden({
        installationHandle,
        instance,
        assays,
        terms,
      });

      instanceTable.create(instanceHandle, instanceRecord);
      return harden({
        ...instanceRecord,
        instanceHandle,
      });
    },
    /**
     * Credibly retrieves an instance record given an instanceHandle.
     * @param {object} instanceHandle - the unique, unforgeable
     * identifier (empty object) for the instance
     */
    getInstance: instanceTable.get,

    /**
     * @param  {object} instanceHandle - unique, unforgeable
     * identifier for instances. (This is an empty object.)
     * @param  {offerRule[]} offerRules - the offer rules, an object
     * with properties `payoutRules` and `exitRule`.
     * @param  {payment[]} offerPayments - payments corresponding to
     * the offer rules. A payment may be `undefined` in the case
     * of specifying a `want`.
     */
    escrow: (offerRules, offerPayments) => {
      const assays = getAssaysFromPayoutRules(offerRules.payoutRules);

      const offerHandle = harden({});

      const offerImmutableRecord = {
        instanceHandle: undefined,
        payoutRules: offerRules.payoutRules,
        exitRule: offerRules.exitRule,
        assays,
        payoutPromise: makePromise(),
        units: undefined,
        extents: undefined,
      };

      // units should only be gotten after the payments are deposited
      offerTable.create(offerHandle, offerImmutableRecord);

      // Promise flow = assay -> purse -> deposit payment -> escrow receipt
      const paymentBalancesP = assays.map((assay, i) => {
        const { purseP, unitOpsP } = assayTable.getOrCreateAssay(assay);
        const payoutRule = offerRules.payoutRules[i];
        const offerPayment = offerPayments[i];

        return Promise.all([purseP, unitOpsP]).then(([purse, unitOps]) => {
          if (
            payoutRule.kind === 'offerExactly' ||
            payoutRule.kind === 'offerAtMost'
          ) {
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

      const giveEscrowReceipt = unitsArray => {
        // Record units for offer.
        // Record the extents as well for backwards compatibility.
        const extentsArray = unitsArray.map(units => units.extent);
        offerTable.update(offerHandle, {
          units: unitsArray,
          extents: extentsArray,
        });

        const escrowReceiptExtent = harden({
          offerHandle,
          offerRules,
        });
        const escrowReceiptPurse = escrowReceiptMint.mint(escrowReceiptExtent);
        const escrowReceipt = escrowReceiptPurse.withdrawAll();

        // Create escrow result to be returned. Depends on exitRules.
        const escrowResult = {
          escrowReceipt,
          payout: offerImmutableRecord.payoutPromise.p,
        };
        const { exitRule } = offerRules;

        // Automatically cancel on deadline.
        if (exitRule.kind === 'afterDeadline') {
          exitRule.timer.setWakeup(
            exitRule.deadline,
            harden({
              wake: () => completeOffers(harden([offerHandle]), assays),
            }),
          );
        }

        // Add an object with a cancel method to escrow result in
        // order to cancel on demand.
        if (exitRule.kind === 'onDemand') {
          escrowResult.cancelObj = {
            cancel: () => completeOffers(harden([offerHandle]), assays),
          };
        }
        return harden(escrowResult);
      };

      const allDepositedP = Promise.all(paymentBalancesP);
      return allDepositedP.then(giveEscrowReceipt);
    },
  });
  return zoeService;
};

export { makeZoe };
