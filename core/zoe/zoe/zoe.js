import harden from '@agoric/harden';
import evaluate from '@agoric/evaluate';

import { insist } from '../../../util/insist';
import { isOfferSafeForAll } from './isOfferSafe';
import { areRightsConserved } from './areRightsConserved';
import { makeEmptyExtents } from '../contractUtils';
import makePromise from '../../../util/makePromise';
import { sameStructure } from '../../../util/sameStructure';

import {
  escrowEmptyOffer,
  escrowOffer,
  mintEscrowReceiptPayment,
  mintPayoffPayment,
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
    seatMint: payoffMint,
    seatAssay: payoffAssay,
    addUseObj: payoffAddUseObj,
  } = makeSeatMint('zoePayoff');

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

  const makeGoverningContractFacet = instanceId => {
    const governingContractFacet = harden({
      /**
       * The governing contract can propose a reallocation of
       * extents per player, which will only succeed if the
       * reallocation 1) conserves rights, and 2) is 'offer safe' for
       * all parties involved. This reallocation is partial, meaning
       * that it applies only to the extents associated with the
       * offerIds that are passed in, rather than applying to all of
       * the extents in the extentMatrix. We are able to ensure
       * that with each reallocation, rights are conserved and offer
       * safety is enforced for all extents, even though the
       * reallocation is partial, because once these invariants are
       * true, they will remain true until changes are made.
       * @param  {object[]} offerIds - an array of offerIds
       * @param  {extent[][]} reallocation - a matrix of extents,
       * with one array of extents per offerId. This is likely
       * a subset of the full extentsMatrix.
       */
      reallocate: (offerIds, reallocation) => {
        const offerDescs = readOnlyState.getOfferDescsFor(offerIds);
        const currentExtents = readOnlyState.getExtentsFor(offerIds);
        const extentOpsArray = readOnlyState.getExtentOpsArrayForInstanceId(
          instanceId,
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
        adminState.setExtentsFor(offerIds, reallocation);
      },

      /**
       * The governing contract can "complete" an offer to remove it
       * from the ongoing governing contract and resolve the
       * `result` promise with the player's payouts (either winnings or
       * refunds). Because Zoe only allows for reallocations that
       * conserve rights and are 'offer safe', we don't need to do
       * those checks at this step and can assume that the
       * invariants hold.
       * @param  {object[]} offerIds - an array of offerIds
       */
      complete: offerIds => completeOffers(adminState, readOnlyState, offerIds),

      /**
       *  The governing contract can create an empty offer and get
       *  the associated offerId. This allows the governing contract
       *  to use this offer slot for recordkeeping. For instance, to
       *  represent a pool, the governing contract can create an
       *  empty offer and then reallocate other extents to this offer.
       */
      escrowEmptyOffer: length => {
        // attenuate the authority by not passing along the result
        // promise object and only passing the offerId
        const { offerId } = escrowEmptyOffer(adminState.recordOffer, length);
        return offerId;
      },
      /**
       *  The governing contract can also create a real offer and
       *  get the associated offerId, bypassing the seat and receipt
       *  creation. This allows the governing contract to make
       *  offers on the users' behalf, as happens in the
       *  `addLiquidity` step of the `autoswap` contract.
       */
      escrowOffer: async (offerDesc, offerPayments) => {
        // attenuate the authority by not passing along the result
        // promise object and only passing the offerId
        const { offerId } = await escrowOffer(
          adminState.recordOffer,
          adminState.recordAssay,
          offerDesc,
          offerPayments,
        );
        return offerId;
      },

      burnEscrowReceipt: async escrowReceipt => {
        const assetDesc = await escrowReceiptAssay.burnAll(escrowReceipt);
        const { id } = assetDesc.extent;
        const { inactive } = readOnlyState.getStatusFor(harden([id]));
        if (inactive.length > 0) {
          return Promise.reject(new Error('offer was cancelled'));
        }
        adminState.recordUsedInInstance(instanceId, id);
        return assetDesc.extent;
      },

      makeInvite: (contractDefinedProperties, useObj) => {
        const installationId = adminState.getInstallationIdForInstanceId(
          instanceId,
        );
        const inviteExtent = harden({
          ...contractDefinedProperties,
          id: harden({}),
          instanceId,
          installationId,
        });
        const invitePurseP = inviteMint.mint(inviteExtent);
        inviteAddUseObj(inviteExtent.id, useObj);
        const invitePaymentP = invitePurseP.withdrawAll();
        return invitePaymentP;
      },

      // read-only, side-effect-free access below this line:
      getStatusFor: readOnlyState.getStatusFor,
      makeEmptyExtents: () =>
        makeEmptyExtents(
          readOnlyState.getExtentOpsArrayForInstanceId(instanceId),
        ),
      getExtentOpsArray: () =>
        readOnlyState.getExtentOpsArrayForInstanceId(instanceId),
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
  // receipt and payoffs in return.

  const publicFacet = harden({
    getEscrowReceiptAssay: () => escrowReceiptAssay,
    getInviteAssay: () => inviteAssay,
    getPayoffAssay: () => payoffAssay,
    getAssaysForInstance: instanceId => readOnlyState.getAssays(instanceId),
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
      const installationId = adminState.addInstallation(installation);
      return installationId;
    },
    /**
     * Installs a governing contract and returns a reference to the
     * instance object, a unique id for the instance that can be
     * shared, and the name of the governing contract installed.
     * @param  {object[]} assays - an array of assays to be used in
     * the governing contract. This determines the order of the offer
     * description elements and offer payments accepted by the
     * governing contract.
     * @param  {object} installationId - the unique id for the installation
     * @param  {[]} args - arguments to the contract. These arguments
     * depend on the contract.
     */
    makeInstance: async (assays, installationId, args = []) => {
      const installation = adminState.getInstallation(installationId);
      const instanceId = harden({});
      await adminState.recordAssaysForInstance(instanceId, assays);
      const governingContractFacet = makeGoverningContractFacet(instanceId);
      const instance = installation.makeContract(
        governingContractFacet,
        ...args,
      );
      adminState.addInstance(instanceId, instance, installationId, args);
      return harden({
        instanceId,
        instance,
        installationId,
        assays,
        args,
      });
    },
    /**
     * Credibly retrieves an instance given an instanceId.
     * @param {object} instanceId - the unique object for the instance
     */
    getInstance: instanceId => {
      const instance = adminState.getInstance(instanceId);
      const installationId = adminState.getInstallationIdForInstanceId(
        instanceId,
      );
      const assays = readOnlyState.getAssays(instanceId);
      const args = readOnlyState.getArgs(instanceId);
      return harden({
        instanceId,
        instance,
        installationId,
        assays,
        args,
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
      const { offerId, result } = await escrowOffer(
        adminState.recordOffer,
        adminState.recordAssay,
        conditions,
        offerPayments,
      );

      const escrowReceiptPaymentP = mintEscrowReceiptPayment(
        escrowReceiptMint,
        offerId,
        conditions,
      );

      const escrowResult = {
        escrowReceipt: escrowReceiptPaymentP,
        payoff: result.p,
        makePayoffPaymentObj: harden({
          makePayoffPayment: () => {
            // if offer has already completed, we cannot make a payment
            const { active } = readOnlyState.getStatusFor(harden([offerId]));
            if (active.length !== 1) {
              throw new Error('offer has already completed');
            }
            result.res([]);
            const newResult = makePromise();
            adminState.replaceResult(offerId, newResult);
            return mintPayoffPayment(
              payoffMint,
              payoffAddUseObj,
              conditions,
              newResult,
              adminState.getInstanceIdForOfferId(offerId),
            );
          },
        }),
      };
      if (conditions.exit.kind === 'afterDeadline') {
        conditions.exit.timer
          .delayUntil(conditions.exit.deadline)
          .then(_ticks =>
            completeOffers(adminState, readOnlyState, harden([offerId])),
          );
      }
      if (conditions.exit.kind === 'onDemand') {
        escrowResult.cancelObj = {
          cancel: () =>
            completeOffers(adminState, readOnlyState, harden([offerId])),
        };
      }
      return harden(escrowResult);
    },
  });
  return publicFacet;
};

export { makeZoe };
