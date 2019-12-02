import harden from '@agoric/harden';

import { insist } from '@agoric/ertp/util/insist';

import { isOfferSafeForAll } from './isOfferSafe';
import { areRightsConserved } from './areRightsConserved';
import { evalContractCode } from './evalContractCode';

import {
  escrowEmptyOffer,
  escrowOffer,
  mintEscrowReceiptPayment,
  completeOffers,
  makeEmptyExtents,
} from './zoeUtils';

import { makeState } from './state';
import { makeSeatMint } from './seatMint';
import { makeEscrowReceiptConfig } from './escrowReceiptConfig';
import { makeMint } from '@agoric/ertp/core/mint';

/**
 * Create an instance of Zoe.
 *
 * @param additionalEndowments pure or pure-ish endowments to add to evaluator
 */
const makeZoe = async (additionalEndowments = {}) => {
  // Zoe has two mints: a mint for invites and a mint for
  // escrowReceipts. The invite mint can be used by a smart contract
  // to create invites to take certain actions in the smart contract.
  // An escrowReceipt is an ERTP payment that is proof of
  // escrowing assets with Zoe.
  const {
    seatMint: inviteMint,
    seatAssay: inviteAssay,
    addUseObj: inviteAddUseObj,
  } = makeSeatMint('zoeInvite');

  const escrowReceiptMint = makeMint(
    'zoeEscrowReceipts',
    makeEscrowReceiptConfig,
  );
  const escrowReceiptAssay = escrowReceiptMint.getAssay();

  const { adminState, readOnlyState } = makeState();

  // Zoe has two different facets: the public Zoe service and the
  // contract facet. Neither facet should give direct access
  // to the `adminState`.

  // The contract facet is what is accessible to the smart contract
  // instance and is remade for each instance. The contract at no time
  // has access to the users' payments or the Zoe purses, or any of
  // the `adminState` of Zoe. The contract can only do a few things
  // through the Zoe contract fact. It can propose a reallocation of
  // extents, complete an offer, and interestingly, can create a new
  // offer itself for record-keeping and other various purposes.

  const makeContractFacet = instanceHandle => {
    const contractFacet = harden({
      /**
       * The contract can propose a reallocation of extents per
       * player, which will only succeed if the reallocation 1)
       * conserves rights, and 2) is 'offer-safe' for all parties
       * involved. This reallocation is partial, meaning that it
       * applies only to the extents associated with the offerHandles
       * that are passed in, rather than applying to all of the
       * extents in the extentMatrix. We are able to ensure that with
       * each reallocation, rights are conserved and offer safety is
       * enforced for all extents, even though the reallocation is
       * partial, because once these invariants are true, they will
       * remain true until changes are made.
       * @param  {object[]} offerHandles - an array of offerHandles
       * @param  {extent[][]} reallocation - a matrix of extents, with
       * one array of extents per offerHandle. This is likely a subset
       * of the full extentsMatrix.
       */
      reallocate: (offerHandles, reallocation) => {
        const payoutRulesArray = readOnlyState.getPayoutRulesFor(offerHandles);
        const currentExtents = readOnlyState.getExtentsFor(offerHandles);
        const extentOpsArray = readOnlyState.getExtentOpsArrayForInstanceHandle(
          instanceHandle,
        );

        // 1) ensure that rights are conserved
        insist(
          areRightsConserved(extentOpsArray, currentExtents, reallocation),
        )`Rights are not conserved in the proposed reallocation`;

        // 2) ensure 'offer safety' for each player
        insist(
          isOfferSafeForAll(extentOpsArray, payoutRulesArray, reallocation),
        )`The proposed reallocation was not offer safe`;

        // 3) save the reallocation
        adminState.setExtentsFor(offerHandles, reallocation);
      },

      /**
       * The contract can "complete" an offer to remove it
       * from the ongoing contract and resolve the
       * `result` promise with the player's payouts (either winnings or
       * refunds). Because Zoe only allows for reallocations that
       * conserve rights and are 'offer-safe', we don't need to do
       * those checks at this step and can assume that the
       * invariants hold.
       * @param  {object[]} offerHandles - an array of offerHandles
       */
      complete: offerHandles =>
        completeOffers(adminState, readOnlyState, offerHandles),

      /**
       *  The contract can create an empty offer and get the
       *  associated offerHandle. This allows the contract to use this
       *  offer slot for record-keeping. For instance, to represent a
       *  pool, the contract can create an empty offer and then
       *  reallocate other extents to this offer.
       */
      escrowEmptyOffer: () => {
        const assays = readOnlyState.getAssays(instanceHandle);
        const labels = readOnlyState.getLabelsForInstanceHandle(instanceHandle);
        const extentOpsArray = readOnlyState.getExtentOpsArrayForInstanceHandle(
          instanceHandle,
        );

        const { offerHandle } = escrowEmptyOffer(
          adminState.recordOffer,
          assays,
          labels,
          extentOpsArray,
        );
        return offerHandle;
      },
      /**
       *  The contract can also create a real offer and get the
       *  associated offerHandle, bypassing the escrow receipt
       *  creation. This allows the contract to make offers on the
       *  users' behalf, as happens in the `addLiquidity` step of the
       *  `autoswap` contract.
       */
      escrowOffer: async (offerRules, offerPayments) => {
        const { offerHandle } = await escrowOffer(
          adminState.recordOffer,
          adminState.recordAssay,
          offerRules,
          offerPayments,
        );
        return offerHandle;
      },

      /**
       * Burn the escrowReceipt ERTP payment using the escrowReceipt
       * assay. Burning in ERTP also validates that the alleged payment was
       * produced by the assay, and returns the
       * units of the payment.
       *
       * This method also checks if the offer has been completed and
       * errors if it has, so that a smart contract doesn't continue
       * thinking that the offer is live. Additionally, we record that
       * the escrowReceipt is used in this particular contract.
       *
       * @param  {object} escrowReceipt - an ERTP payment
       * representing proof of escrowing specific assets with Zoe.
       */

      burnEscrowReceipt: async escrowReceipt => {
        const units = await escrowReceiptAssay.burnAll(escrowReceipt);
        const { offerHandle } = units.extent;
        const { inactive } = readOnlyState.getStatusFor(harden([offerHandle]));
        if (inactive.length > 0) {
          return Promise.reject(new Error('offer was cancelled'));
        }
        adminState.recordUsedInInstance(instanceHandle, offerHandle);
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
       * `instanceId` and is omitted even though it is useful.
       * @param  {object} contractDefinedExtent - an object of
       * information to include in the extent, as defined by the smart
       * contract
       * @param  {object} useObj - an object defined by the smart
       * contract that is the use right associated with the invite. In
       * other words, buying the invite is buying the right to call
       * methods on this object.
       */
      makeInvite: (contractDefinedExtent, useObj) => {
        const inviteExtent = harden({
          ...contractDefinedExtent,
          handle: harden({}),
          instanceHandle,
        });
        const invitePurseP = inviteMint.mint(inviteExtent);
        inviteAddUseObj(inviteExtent.handle, useObj);
        const invitePaymentP = invitePurseP.withdrawAll();
        return invitePaymentP;
      },

      /** read-only, side-effect-free access below this line */
      getStatusFor: readOnlyState.getStatusFor,
      makeEmptyExtents: () =>
        makeEmptyExtents(
          readOnlyState.getExtentOpsArrayForInstanceHandle(instanceHandle),
        ),
      getExtentOpsArray: () =>
        readOnlyState.getExtentOpsArrayForInstanceHandle(instanceHandle),
      getLabels: () => readOnlyState.getLabelsForInstanceHandle(instanceHandle),
      getExtentsFor: readOnlyState.getExtentsFor,
      getPayoutRulesFor: readOnlyState.getPayoutRulesFor,
      getInviteAssay: () => inviteAssay,
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
    getEscrowReceiptAssay: () => escrowReceiptAssay,
    getInviteAssay: () => inviteAssay,
    getAssaysForInstance: instanceHandle =>
      readOnlyState.getAssays(instanceHandle),
    /**
     * Create an installation by safely evaluating the code and
     * registering it with Zoe.
     *
     * We have a moduleFormat to allow for different future formats
     * without silent failures.
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
      const installationHandle = adminState.addInstallation(installation);
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
    makeInstance: async (installationHandle, terms) => {
      const installation = adminState.getInstallation(installationHandle);
      const instanceHandle = harden({});
      const contractFacet = makeContractFacet(instanceHandle);
      const { instance, assays } = installation.makeContract(
        contractFacet,
        terms,
      );
      const newTerms = harden({ ...terms, assays });
      await adminState.addInstance(
        instanceHandle,
        instance,
        installationHandle,
        newTerms,
        assays,
      );
      return harden({
        installationHandle,
        instanceHandle,
        instance,
        terms: newTerms,
      });
    },
    /**
     * Credibly retrieves an instance given an instanceHandle.
     * @param {object} instanceHandle - the unique object for the instance
     */
    getInstance: instanceHandle => {
      const instance = adminState.getInstance(instanceHandle);
      const installationHandle = adminState.getInstallationHandleForInstanceHandle(
        instanceHandle,
      );
      const terms = readOnlyState.getTerms(instanceHandle);
      return harden({
        instanceHandle,
        instance,
        installationHandle,
        terms,
      });
    },

    /**
     * @param  {payoutRule[]} payoutRules - the offer description, an
     * array of objects with `kind` and `units` properties.
     * @param  {payment[]} offerPayments - payments corresponding to
     * the offer description. A payment may be `undefined` in the case
     * of specifying a `want`.
     */
    escrow: async (offerRules, offerPayments) => {
      const { offerHandle, result } = await escrowOffer(
        adminState.recordOffer,
        adminState.recordAssay,
        offerRules,
        offerPayments,
      );

      const escrowReceiptPaymentP = mintEscrowReceiptPayment(
        escrowReceiptMint,
        offerHandle,
        offerRules,
      );

      const escrowResult = {
        escrowReceipt: escrowReceiptPaymentP,
        payout: result.p,
      };
      const { exitRule = { kind: 'onDemand' } } = offerRules;
      if (exitRule.kind === 'afterDeadline') {
        const exit = harden({
          wake: () =>
            completeOffers(adminState, readOnlyState, harden([offerHandle])),
        });
        offerRules.exitRule.timer.setWakeup(offerRules.exitRule.deadline, exit);
      }
      if (exitRule.kind === 'onDemand') {
        escrowResult.cancelObj = {
          cancel: () =>
            completeOffers(adminState, readOnlyState, harden([offerHandle])),
        };
      }
      return harden(escrowResult);
    },
  });
  return zoeService;
};

export { makeZoe };
