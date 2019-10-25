import harden from '@agoric/harden';
import evaluate from '@agoric/evaluate';
import Nat from '@agoric/nat';

import { insist } from '../../../util/insist';
import { isOfferSafeForAll } from './isOfferSafe';
import { areRightsConserved } from './areRightsConserved';
import { makeEmptyExtents, makeAssetDesc } from '../contractUtils';
import makePromise from '../../../util/makePromise';
import { sameStructure } from '../../../util/sameStructure';

import {
  escrowEmptyOffer,
  escrowOffer,
  mintEscrowReceiptPayment,
  mintPayoutPayment,
  completeOffers,
} from './zoeUtils';

import { makeState } from './state';
import { makeSeatMint } from '../../seatMint';
import { makeEscrowReceiptConfig } from './escrowReceiptConfig';
import { makeMint } from '../../mint';

/**
 * Create an instance of Zoe.
 *
 * @param additionalEndowments pure or pure-ish endowments to add to evaluator
 */
const makeZoe = async (additionalEndowments = {}) => {
  // The escrowReceiptAssay is a long-lived identity over many
  // contract instances
  const {
    seatMint: inviteMint,
    seatAssay: inviteAssay,
    addUseObj: inviteAddUseObj,
  } = makeSeatMint('zoeInvite');

  const {
    seatMint: payoutMint,
    seatAssay: payoutAssay,
    addUseObj: payoutAddUseObj,
  } = makeSeatMint('zoePayout');

  const escrowReceiptMint = makeMint(
    'zoeEscrowReceipts',
    makeEscrowReceiptConfig,
  );
  const escrowReceiptAssay = escrowReceiptMint.getAssay();

  const defaultEndowments = {
    harden,
    makePromise,
    insist,
    sameStructure,
    makeMint,
    Nat,
  };
  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
    ...Object.getOwnPropertyDescriptors(additionalEndowments),
  });
  const evaluateStringToFn = functionSrcString => {
    insist(typeof functionSrcString === 'string')`\n
"${functionSrcString}" must be a string, but was ${typeof functionSrcString}`;
    const fn = evaluate(functionSrcString, fullEndowments);
    insist(typeof fn === 'function')`\n
"${functionSrcString}" must be a string for a function, but produced ${typeof fn}`;
    return fn;
  };

  const makeInstallationFromSrcs = srcs => {
    const installation = {};
    for (const fname of Object.getOwnPropertyNames(srcs)) {
      if (typeof fname === 'string') {
        const fn = evaluateStringToFn(srcs[fname]);
        installation[fname] = fn;
      }
    }
    return installation;
  };

  const { adminState, readOnlyState } = await makeState();

  // Zoe has two different facets: the public facet and the
  // governingContract facet. Neither facet should give direct access
  // to the `adminState`.

  // The `governingContractFacet` is what is accessible by the
  // governing contract. The governing contract at no time has
  // access to the users' payments or the Zoe purses, or any of
  // the `adminState` of Zoe. The governing contract can do a
  // couple of things. It can propose a reallocation of
  // extents, complete an offer, and interestingly, can create a
  // new offer itself for recordkeeping and other various
  // purposes.

  const makeGoverningContractFacet = instanceHandle => {
    const governingContractFacet = harden({
      /**
       * The governing contract can propose a reallocation of
       * extents per player, which will only succeed if the
       * reallocation 1) conserves rights, and 2) is 'offer safe' for
       * all parties involved. This reallocation is partial, meaning
       * that it applies only to the extents associated with the
       * offerHandles that are passed in, rather than applying to all of
       * the extents in the extentMatrix. We are able to ensure
       * that with each reallocation, rights are conserved and offer
       * safety is enforced for all extents, even though the
       * reallocation is partial, because once these invariants are
       * true, they will remain true until changes are made.
       * @param  {object[]} offerHandles - an array of offerHandles
       * @param  {extent[][]} reallocation - a matrix of extents,
       * with one array of extents per offerHandle. This is likely
       * a subset of the full extentsMatrix.
       */
      reallocate: (offerHandles, reallocation) => {
        const offerDescs = readOnlyState.getOfferDescsFor(offerHandles);
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
          isOfferSafeForAll(extentOpsArray, offerDescs, reallocation),
        )`The proposed reallocation was not offer safe`;

        // 3) save the reallocation
        adminState.setExtentsFor(offerHandles, reallocation);
      },

      /**
       * The governing contract can "complete" an offer to remove it
       * from the ongoing governing contract and resolve the
       * `result` promise with the player's payouts (either winnings or
       * refunds). Because Zoe only allows for reallocations that
       * conserve rights and are 'offer safe', we don't need to do
       * those checks at this step and can assume that the
       * invariants hold.
       * @param  {object[]} offerHandles - an array of offerHandles
       */
      complete: offerHandles =>
        completeOffers(adminState, readOnlyState, offerHandles),

      /**
       *  The governing contract can create an empty offer and get
       *  the associated offerHandle. This allows the governing contract
       *  to use this offer slot for recordkeeping. For instance, to
       *  represent a pool, the governing contract can create an
       *  empty offer and then reallocate other extents to this offer.
       */
      escrowEmptyOffer: () => {
        // attenuate the authority by not passing along the result
        // promise object and only passing the offerHandle

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
       *  The governing contract can also create a real offer and
       *  get the associated offerHandle, bypassing the seat and receipt
       *  creation. This allows the governing contract to make
       *  offers on the users' behalf, as happens in the
       *  `addLiquidity` step of the `autoswap` contract.
       */
      escrowOffer: async (conditions, offerPayments) => {
        // attenuate the authority by not passing along the result
        // promise object and only passing the offerHandle
        const { offerHandle } = await escrowOffer(
          adminState.recordOffer,
          adminState.recordAssay,
          conditions,
          offerPayments,
        );
        return offerHandle;
      },

      burnEscrowReceipt: async escrowReceipt => {
        const assetDesc = await escrowReceiptAssay.burnAll(escrowReceipt);
        const { offerHandle } = assetDesc.extent;
        const { inactive } = readOnlyState.getStatusFor(harden([offerHandle]));
        if (inactive.length > 0) {
          return Promise.reject(new Error('offer was cancelled'));
        }
        adminState.recordUsedInInstance(instanceHandle, offerHandle);
        return assetDesc.extent;
      },

      makeInvite: (contractDefinedProperties, useObj) => {
        const installationHandle = adminState.getInstallationHandleForInstanceHandle(
          instanceHandle,
        );
        const inviteExtent = harden({
          ...contractDefinedProperties,
          offerHandle: harden({}),
          instanceHandle,
          installationHandle,
          terms: readOnlyState.getTerms(instanceHandle),
        });
        const invitePurseP = inviteMint.mint(inviteExtent);
        inviteAddUseObj(inviteExtent.offerHandle, useObj);
        const invitePaymentP = invitePurseP.withdrawAll();
        return invitePaymentP;
      },

      makeConditions: (rules, extents, exit) => {
        const extentOpsArray = readOnlyState.getExtentOpsArrayForInstanceHandle(
          instanceHandle,
        );
        const labels = readOnlyState.getLabelsForInstanceHandle(instanceHandle);
        const offerDesc = extentOpsArray.map((extentOps, i) =>
          harden({
            rule: rules[i],
            assetDesc: makeAssetDesc(extentOps, labels[i], extents[i]),
          }),
        );
        return harden({
          offerDesc,
          exit,
        });
      },

      // read-only, side-effect-free access below this line
      getStatusFor: readOnlyState.getStatusFor,
      makeEmptyExtents: () =>
        makeEmptyExtents(
          readOnlyState.getExtentOpsArrayForInstanceHandle(instanceHandle),
        ),
      getExtentOpsArray: () =>
        readOnlyState.getExtentOpsArrayForInstanceHandle(instanceHandle),
      getLabels: () => readOnlyState.getLabelsForInstanceHandle(instanceHandle),
      getExtentsFor: readOnlyState.getExtentsFor,
      getOfferDescsFor: readOnlyState.getOfferDescsFor,
      getInviteAssay: () => inviteAssay,
      getEscrowReceiptAssay: () => escrowReceiptAssay,
    });
    return governingContractFacet;
  };

  // The `publicFacet` of the zoe has three main methods: `makeInstance`
  // installs a governing contract and creates an instance,
  // `getInstance` credibly retrieves an instance from zoe, and
  // `escrow` allows users to securely escrow and get an escrow
  // receipt and payouts in return.

  const publicFacet = harden({
    getEscrowReceiptAssay: () => escrowReceiptAssay,
    getInviteAssay: () => inviteAssay,
    getPayoutAssay: () => payoutAssay,
    getAssaysForInstance: instanceHandle =>
      readOnlyState.getAssays(instanceHandle),
    install: (srcs, moduleFormat = 'object') => {
      let installation;
      if (moduleFormat === 'object') {
        installation = makeInstallationFromSrcs(srcs);
      } else if (moduleFormat === 'getExport') {
        // Evaluate the export function, and use the resulting
        // module namespace as our installation.
        const getExport = evaluateStringToFn(srcs);
        installation = getExport();
      } else {
        insist(false)`\
Unrecognized moduleFormat ${moduleFormat}`;
      }
      const installationHandle = adminState.addInstallation(installation);
      return installationHandle;
    },
    /**
     * Installs a governing contract and returns a reference to the
     * instance object, a unique handle for the instance that can be
     * shared, and the name of the governing contract installed.
     * @param  {object[]} assays - an array of assays to be used in
     * the governing contract. This determines the order of the offer
     * description elements and offer payments accepted by the
     * governing contract.
     * @param  {object} installationHandle - the unique handle for the installation
     * @param  {[]} args - arguments to the contract. These arguments
     * depend on the contract.
     */
    makeInstance: async (installationHandle, terms) => {
      const installation = adminState.getInstallation(installationHandle);
      const instanceHandle = harden({});
      const governingContractFacet = makeGoverningContractFacet(instanceHandle);
      const { instance, assays } = installation.makeContract(
        governingContractFacet,
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
     * @param  {offerDescElem[]} offerDesc - the offer description, an
     * array of objects with `rule` and `assetDesc` properties.
     * @param  {payment[]} offerPayments - payments corresponding to
     * the offer description. A payment may be `undefined` in the case
     * of specifying a `want`.
     */
    escrow: async (conditions, offerPayments) => {
      const { offerHandle, result } = await escrowOffer(
        adminState.recordOffer,
        adminState.recordAssay,
        conditions,
        offerPayments,
      );

      const escrowReceiptPaymentP = mintEscrowReceiptPayment(
        escrowReceiptMint,
        offerHandle,
        conditions,
      );

      const escrowResult = {
        escrowReceipt: escrowReceiptPaymentP,
        payout: result.p,
        makePayoutPaymentObj: harden({
          makePayoutPayment: () => {
            // if offer has already completed, we cannot make a payment
            const { active } = readOnlyState.getStatusFor(
              harden([offerHandle]),
            );
            if (active.length !== 1) {
              throw new Error('offer has already completed');
            }
            result.res([]);
            const newResult = makePromise();
            adminState.replaceResult(offerHandle, newResult);
            return mintPayoutPayment(
              payoutMint,
              payoutAddUseObj,
              conditions,
              newResult,
              adminState.getInstanceHandleForOfferHandle(offerHandle),
            );
          },
        }),
      };
      const { exit: exitCondition = { kind: 'onDemand' } } = conditions;
      if (exitCondition.kind === 'afterDeadline') {
        conditions.exit.timer
          .delayUntil(conditions.exit.deadline)
          .then(_ticks =>
            completeOffers(adminState, readOnlyState, harden([offerHandle])),
          );
      }
      if (exitCondition.kind === 'onDemand') {
        escrowResult.cancelObj = {
          cancel: () =>
            completeOffers(adminState, readOnlyState, harden([offerHandle])),
        };
      }
      return harden(escrowResult);
    },
  });
  return publicFacet;
};

export { makeZoe };
