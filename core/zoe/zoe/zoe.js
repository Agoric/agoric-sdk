import harden from '@agoric/harden';
import evaluate from '@agoric/evaluate';

import { insist } from '../../../util/insist';
import { isOfferSafeForAll } from './isOfferSafe';
import { areRightsConserved } from './areRightsConserved';
import { toAssetDescMatrix, makeEmptyExtents } from '../contractUtils';
import makePromise from '../../../util/makePromise';

import {
  makePayments,
  escrowEmptyOffer,
  escrowOffer,
  mintEscrowReceiptPayment,
  mintPayoffPayment,
  fillInUndefinedExtents,
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

  const makeGoverningContractFacet = instanceId =>
    harden({
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
        const extentOps = readOnlyState.getExtentOps(instanceId);

        // 1) ensure that rights are conserved
        insist(
          areRightsConserved(extentOps, currentExtents, reallocation),
        )`Rights are not conserved in the proposed reallocation`;

        // 2) ensure 'offer safety' for each player
        insist(
          isOfferSafeForAll(extentOps, offerDescs, reallocation),
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
      complete: async offerIds => {
        const extents = readOnlyState.getExtentsFor(offerIds);
        const extentOps = readOnlyState.getExtentOps(instanceId);
        const labels = readOnlyState.getLabels(instanceId);
        const assetDescs = toAssetDescMatrix(extentOps, labels, extents);
        const purses = adminState.getPurses(instanceId);
        const payments = await makePayments(purses, assetDescs);
        const results = adminState.getResultsFor(offerIds);
        results.map((result, i) => result.res(payments[i]));
        adminState.removeOffers(offerIds);
      },

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
          adminState.getOrMakePurseForAssay,
          offerDesc,
          offerPayments,
        );
        return offerId;
      },

      burnEscrowReceipt: async escrowReceipt => {
        const assetDesc = await escrowReceiptAssay.burnAll(escrowReceipt);
        const { id } = assetDesc.extent;
        const offerIds = harden([id]);
        await fillInUndefinedExtents(
          adminState,
          readOnlyState,
          offerIds,
          instanceId,
        );
        adminState.recordUsedInInstance(instanceId, id);
        return assetDesc.extent;
      },

      makeInvite: (offerToBeMade, useObj) => {
        const inviteExtent = harden({
          id: harden({}),
          instanceId,
          offerToBeMade,
        });
        const invitePurseP = inviteMint.mint(inviteExtent);
        inviteAddUseObj(inviteExtent.id, useObj);
        const invitePaymentP = invitePurseP.withdrawAll();
        return invitePaymentP;
      },

      // read-only, side-effect-free access below this line:
      makeEmptyExtents: () => makeEmptyExtents(readOnlyState.getExtentOps()),
      getExtentOps: () => readOnlyState.getExtentOps(instanceId),
      getExtentsFor: readOnlyState.getExtentsFor,
      getOfferDescsFor: readOnlyState.getOfferDescsFor,
      getInviteAssay: () => inviteAssay,
      getEscrowReceiptAssay: () => escrowReceiptAssay,
    });

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
     * @param  {string} libraryName - the wellknown name for the
     * governing contract to be installed
     * @param  {object[]} assays - an array of assays to be used in
     * the governing contract. This determines the order of the offer
     * description elements and offer payments accepted by the
     * governing contract.
     */
    makeInstance: async (assays, installationId) => {
      const installation = adminState.getInstallation(installationId);
      const instanceId = harden({});
      const governingContractFacet = makeGoverningContractFacet(instanceId);
      const instance = installation.makeContract(governingContractFacet);
      await adminState.addInstance(
        instanceId,
        instance,
        installationId,
        assays,
      );
      return harden({
        instance,
        instanceId,
        installationId,
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
      return harden({
        instance,
        instanceId,
        installationId,
      });
    },

    /**
     * @param  {offerDescElem[]} offerDesc - the offer description, an
     * array of objects with `rule` and `assetDesc` properties.
     * @param  {payment[]} offerPayments - payments corresponding to
     * the offer description. A payment may be `undefined` in the case
     * of specifying a `want`.
     */
    escrow: async (offerDesc, offerPayments) => {
      const { offerId, result } = await escrowOffer(
        adminState.recordOffer,
        adminState.getOrMakePurseForAssay,
        offerDesc,
        offerPayments,
      );

      const escrowReceiptPaymentP = mintEscrowReceiptPayment(
        escrowReceiptMint,
        offerId,
        offerDesc,
      );

      return {
        escrowReceipt: escrowReceiptPaymentP,
        payoff: result.p,
        makePayoffPaymentObj: harden({
          makePayoffPayment: () => {
            // if offer has already completed, we cannot make a payment
            if (!readOnlyState.isOfferIdActive(offerId)) {
              throw new Error('offer has already completed');
            }
            result.reject(
              'A new payoff ERTP payment was made, making this invalid.',
            );
            const newResult = makePromise();
            adminState.replaceResult(offerId, newResult);
            return mintPayoffPayment(
              payoffMint,
              payoffAddUseObj,
              offerDesc,
              newResult,
              adminState.getInstanceIdForOfferId(offerId),
            );
          },
        }),
      };
    },
  });
  return publicFacet;
};

export { makeZoe };
