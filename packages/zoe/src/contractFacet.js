// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

// @ts-check

import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { isOfferSafe } from './offerSafety';
import { areRightsConserved } from './rightsConservation';
import { assertKeywordName, getKeywords } from './cleanProposal';
import { makeContractTables } from './state';
import { filterObj, filterFillAmounts } from './objArrayConversion';
import { evalContractBundle } from './evalContractCode';

/**
 * @typedef {Object} ContractFacet
 * The Zoe interface specific to a contract instance.
 * The Zoe Contract Facet is an API object used by running contract instances to
 * access the Zoe state for that instance. The Zoe Contract Facet is accessed
 * synchronously from within the contract, and usually is referred to in code as
 * zcf.
 * @property {Reallocate} reallocate Propose a reallocation of amounts per offer
 * @property {Complete} complete Complete an offer
 * @property {MakeInvitation} makeInvitation
 * @property {AddNewIssuer} addNewIssuer
 * @property {InitPublicAPI} initPublicAPI
 * @property {() => ZoeService} getZoeService
 * @property {() => Issuer} getInviteIssuer
 * @property {(offerHandles: OfferHandle[]) => { active: OfferStatus[], inactive: OfferStatus[] }} getOfferStatuses
 * @property {(offerHandle: OfferHandle) => boolean} isOfferActive
 * @property {(offerHandles: OfferHandle[]) => OfferRecord[]} getOffers
 * @property {(offerHandle: OfferHandle) => OfferRecord} getOffer
 * @property {(offerHandle: OfferHandle, brandKeywordRecord?: BrandKeywordRecord) => Allocation} getCurrentAllocation
 * @property {(offerHandles: OfferHandle[], brandKeywordRecords?: BrandKeywordRecord[]) => Allocation[]} getCurrentAllocations
 * @property {() => InstanceRecord} getInstanceRecord
 * @property {(issuer: Issuer) => Brand} getBrandForIssuer
 * @property {(brand: Brand) => AmountMath} getAmountMath
 * @property {() => Promise<import('@agoric/notifier').Notifier<OfferRecord>>} getOfferNotifier
 * @property {() => VatAdmin} getVatAdmin
` *
 * @callback Reallocate
 * The contract can propose a reallocation of amounts across offers
 * by providing two parallel arrays: offerHandles and newAllocations.
 * Each element of newAllocations is an AmountKeywordRecord whose
 * amount should replace the old amount for that keyword for the
 * corresponding offer.
 *
 * The reallocation will only succeed if the reallocation 1) conserves
 * rights (the amounts specified have the same total value as the
 * current total amount), and 2) is 'offer-safe' for all parties involved.
 *
 * The reallocation is partial, meaning that it applies only to the
 * amount associated with the offerHandles that are passed in. By
 * induction, if rights conservation and offer safety hold before,
 * they will hold after a safe reallocation, even though we only
 * re-validate for the offers whose allocations will change. Since
 * rights are conserved for the change, overall rights will be unchanged,
 * and a reallocation can only effect offer safety for offers whose
 * allocations change.
 *
 * zcf.reallocate will throw an error if any of the
 * newAllocations do not have a value for all the
 * keywords in sparseKeywords. An error will also be thrown if
 * any newAllocations have keywords that are not in
 * sparseKeywords.
 *
 * @param  {OfferHandle[]} offerHandles An array of offerHandles
 * @param  {AmountKeywordRecord[]} newAllocations An
 * array of amountKeywordRecords  - objects with keyword keys
 * and amount values, with one keywordRecord per offerHandle.
 * @returns {undefined}
 *
 * @callback Complete
 * The contract can "complete" an offer to remove it from the
 * ongoing contract and resolve the player's payouts (either
 * winnings or refunds). Because Zoe only allows for
 * reallocations that conserve rights and are 'offer-safe', we
 * don't need to do those checks at this step and can assume
 * that the invariants hold.
 * @param  {OfferHandle[]} offerHandles - an array of offerHandles
 * @returns {void}
 *
 * @callback MakeInvitation
 * Make a credible Zoe invite for a particular smart contract
 * indicated by the unique `instanceHandle`. The other
 * information in the value of this invite is decided by the
 * governing contract and should include whatever information is
 * necessary for a potential buyer of the invite to know what
 * they are getting. Note: if information can be derived in
 * queries based on other information, we choose to omit it. For
 * instance, `installationHandle` can be derived from
 * `instanceHandle` and is omitted even though it is useful.
 * @param {OfferHook} offerHook - a function that will be handed the
 * offerHandle at the right time, and returns a contract-specific
 * OfferOutcome which will be put in the OfferResultRecord.
 * @param {string} inviteDesc
 * @param {MakeInvitationOptions} [options]
 * @returns {Invite}
 *
 * @typedef MakeInvitationOptions
 * @property {CustomProperties} [customProperties] - an object containing
 * information to include in the invitation's value, as defined by the smart
 * contract
 *
 * @callback OfferHook
 * This function will be called with the OfferHandle when the offer
 * is prepared. It should return a contract-specific "OfferOutcome"
 * value that will be put in the OfferResultRecord.
 * @param {OfferHandle} offerHandle
 * @returns {OfferOutcome}
 *
 * @callback AddNewIssuer
 * Informs Zoe about an issuer and returns a promise for acknowledging
 * when the issuer is added and ready.
 * @param {Promise<Issuer>|Issuer} issuerP Promise for issuer
 * @param {Keyword} keyword Keyword for added issuer
 * @returns {Promise<IssuerRecord>} Issuer is added and ready
 *
 * @callback InitPublicAPI
 * Initialize the publicAPI for the contract instance, as stored by Zoe in
 * the instanceRecord.
 * @param {Object} publicAPI - an object whose methods are the API
 * available to anyone who knows the instanceHandle
 * @returns {void}
 * 
 * @callback StartContract
 * Makes a contract instance from an installation and returns a
 * unique handle for the instance that can be shared, as well as
 * other information, such as the terms used in the instance.
 * @param {ZoeService} zoeService - The canonical Zoe service in case the contract wants it
 * @param innerZoe - An inner facet of Zoe for the contractFacet's use
 * @param {Object<string,Issuer>} issuerKeywordRecord - a record mapping
 * keyword keys to issuer values
 * @param {SourceBundle} bundle an object containing source code and moduleFormat
 * @param {Issuer} inviteIssuerIn, Zoe's inviteIssuer, for the contract to use
 * @param {Object} instanceData, fields for the instanceRecord
 * @returns {Promise<{ inviteP: Promise<Invite>, zcfForZoe: ZcfInnerFacet }>}
 */

/**
 * @typedef {Object} VatAdmin
 * A powerful object that can be used to terminate the vat in which a contract
 * is running, to get statistics, or to be notified when it terminates. The
 * VatAdmin object is only available to the contract from within the contract so
 * that clients of the contract can tell (by getting the source code from Zoe
 * using the instanceHandle) what use the contract makes of it. If they want to
 * be assured of discretion, or want to know that the contract doesn't have the
 * ability to call terminate(), Zoe makes this visible.
 *
 * @property {() => Object} done
 * provides a promise that will be fullfilled when the contract is terminated.
 * @property {() => undefined} terminate
 * kills the vat in which the contract is running
 * @property {() => Object} adminData
 * provides some statistics about the vat in which the contract is running.
 */

/**
 * Create the contract instance.
 *
 * @returns {{ startContract: StartContract }} The returned instance
 */
export function buildRootObject(_vatPowers) {
  const visibleInstanceRecordFields = [
    'instanceHandle',
    'installationHandle',
    'publicAPI',
    'terms',
    'issuerKeywordRecord',
    'brandKeywordRecord',
  ];
  const visibleInstanceRecord = instanceRecord =>
    filterObj(instanceRecord, visibleInstanceRecordFields);

  const { offerTable, issuerTable } = makeContractTables();

  const getAmountMathForBrand = brand => issuerTable.get(brand).amountMath;

  const assertOffersAreActive = candidateOfferHandles =>
    candidateOfferHandles.forEach(offerHandle =>
      assert(offerTable.has(offerHandle), details`Offer is not active`),
    );

  const removeAmountsAndNotifier = offerRecord =>
    filterObj(offerRecord, ['handle', 'instanceHandle', 'proposal']);
  const removePurse = issuerRecord =>
    filterObj(issuerRecord, ['issuer', 'brand', 'amountMath']);

  const doGetCurrentAllocation = (offerHandle, brandKeywordRecord) => {
    const { currentAllocation } = offerTable.get(offerHandle);
    if (brandKeywordRecord === undefined) {
      return currentAllocation;
    }
    /** @type {AmountMathKeywordRecord} */
    const amountMathKeywordRecord = {};
    Object.getOwnPropertyNames(brandKeywordRecord).forEach(keyword => {
      const brand = brandKeywordRecord[keyword];
      amountMathKeywordRecord[keyword] = issuerTable.get(brand).amountMath;
    });
    return filterFillAmounts(currentAllocation, amountMathKeywordRecord);
  };

  const doGetCurrentAllocations = (offerHandles, brandKeywordRecords) => {
    if (brandKeywordRecords === undefined) {
      return offerHandles.map(offerHandle =>
        doGetCurrentAllocation(offerHandle),
      );
    }
    return offerHandles.map((offerHandle, i) =>
      doGetCurrentAllocation(offerHandle, brandKeywordRecords[i]),
    );
  };

  const reallocate = (offerHandles, newAllocations, zoeForZcf) => {
    assertOffersAreActive(offerHandles);
    // We may want to handle this with static checking instead.
    // Discussion at: https://github.com/Agoric/agoric-sdk/issues/1017
    assert(
      offerHandles.length >= 2,
      details`reallocating must be done over two or more offers`,
    );
    assert(
      offerHandles.length === newAllocations.length,
      details`There must be as many offerHandles as entries in newAllocations`,
    );

    // 1) Ensure 'offer safety' for each offer separately.
    const makeOfferSafeReallocation = (offerHandle, newAllocation) => {
      const { proposal, currentAllocation } = offerTable.get(offerHandle);
      const reallocation = harden({
        ...currentAllocation,
        ...newAllocation,
      });

      assert(
        isOfferSafe(getAmountMathForBrand, proposal, reallocation),
        details`The reallocation was not offer safe`,
      );
      return reallocation;
    };

    // Make the reallocation and test for offer safety by comparing the
    // reallocation to the original proposal.
    const reallocations = offerHandles.map((offerHandle, i) =>
      makeOfferSafeReallocation(offerHandle, newAllocations[i]),
    );

    // 2. Ensure that rights are conserved overall.
    const flattened = arr => [].concat(...arr);
    const flattenAllocations = allocations =>
      flattened(allocations.map(allocation => Object.values(allocation)));

    const currentAllocations = offerTable
      .getOffers(offerHandles)
      .map(({ currentAllocation }) => currentAllocation);
    const previousAmounts = flattenAllocations(currentAllocations);
    const newAmounts = flattenAllocations(reallocations);

    assert(
      areRightsConserved(getAmountMathForBrand, previousAmounts, newAmounts),
      details`Rights are not conserved in the proposed reallocation`,
    );

    // 3. Save the reallocations.
    offerTable.updateAmounts(offerHandles, reallocations);
    E(zoeForZcf).updateAmounts(offerHandles, reallocations);
  };

  const addNewIssuer = (issuerP, keyword, instanceRecord, zoeForZcf) =>
    issuerTable.getPromiseForIssuerRecord(issuerP).then(issuerRecord => {
      E(zoeForZcf).addNewIssuer(issuerP, keyword);
      assertKeywordName(keyword);
      assert(
        !getKeywords(instanceRecord.issuerKeywordRecord).includes(keyword),
        details`keyword ${keyword} must be unique`,
      );
      const newIssuerKeywordRecord = {
        ...instanceRecord.issuerKeywordRecord,
        [keyword]: issuerRecord.issuer,
      };
      const newBrandKeywordRecord = {
        ...instanceRecord.brandKeywordRecord,
        [keyword]: issuerRecord.brand,
      };
      instanceRecord.brandKeywordRecord = newBrandKeywordRecord;
      instanceRecord.issuerKeywordRecord = newIssuerKeywordRecord;

      return removePurse(issuerRecord);
    });

  function completeOffers(offerHandlesToDrop, zoeForZcf) {
    assertOffersAreActive(offerHandlesToDrop);
    offerTable.deleteOffers(offerHandlesToDrop);
    return E(zoeForZcf).completeOffers(offerHandlesToDrop);
  }

  /** @returns {ContractFacet} */
  const makeContractFacet = (
    zoeService,
    instanceRecord,
    inviteIssuer,
    zoeForZcf,
  ) => {
    let publicApiInitialized = false;

    return harden({
      reallocate: (offerHandles, newAllocations) =>
        reallocate(offerHandles, newAllocations, zoeForZcf),
      addNewIssuer: (issuerP, keyword) =>
        addNewIssuer(issuerP, keyword, instanceRecord, zoeForZcf),
      complete: offerHandlesToDrop =>
        completeOffers(offerHandlesToDrop, zoeForZcf),
      makeInvitation: (offerHandler, inviteDesc, options = harden({})) => {
        const inviteHandler = harden({ invoke: offerHandler });
        return E(zoeForZcf).makeInvitation(inviteHandler, inviteDesc, options);
      },
      initPublicAPI: newPublicAPI => {
        assert(
          !publicApiInitialized,
          details`the publicAPI has already been initialized`,
        );
        publicApiInitialized = true;
        E(zoeForZcf).updatePublicAPI(newPublicAPI);
      },

      // The methods below are pure and have no side-effects //
      getZoeService: () => zoeService,

      getInviteIssuer: () => inviteIssuer,

      getOfferNotifier: E(zoeService).getOfferNotifier,

      getOfferStatuses: offerHandles => {
        const { active, inactive } = offerTable.getOfferStatuses(offerHandles);
        return harden({ active, inactive });
      },
      isOfferActive: offerHandle => {
        const isActive = offerTable.isOfferActive(offerHandle);
        // if offer isn't present, we do not want to throw.
        return isActive;
      },
      getOffers: offerHandles => {
        assertOffersAreActive(offerHandles);
        return offerTable.getOffers(offerHandles).map(removeAmountsAndNotifier);
      },
      getOffer: offerHandle => {
        assertOffersAreActive(harden([offerHandle]));
        return removeAmountsAndNotifier(offerTable.get(offerHandle));
      },
      getCurrentAllocation: (offerHandle, brandKeywordRecord) => {
        assertOffersAreActive(harden([offerHandle]));
        return doGetCurrentAllocation(offerHandle, brandKeywordRecord);
      },
      getCurrentAllocations: (offerHandles, brandKeywordRecords) => {
        assertOffersAreActive(offerHandles);
        return doGetCurrentAllocations(offerHandles, brandKeywordRecords);
      },
      getInstanceRecord: () => visibleInstanceRecord(instanceRecord),
      getIssuerForBrand: brand => issuerTable.get(brand).issuer,
      getBrandForIssuer: issuer => issuerTable.brandFromIssuer(issuer),
      getAmountMath: getAmountMathForBrand,
      getVatAdmin: instanceRecord.adminNode,
    });
  };

  /**
   * @type {ZcfInnerFacet}
   */
  const makeZcfForZoe = (instanceHandle, zoeForZcf) =>
    harden({
      addOffer: (offerHandle, proposal, allocation) => {
        const ignoringUpdater = harden({
          updateState: () => {},
          finish: () => {},
        });
        const offerRecord = {
          instanceHandle,
          proposal,
          currentAllocation: allocation,
          notifier: undefined,
          updater: ignoringUpdater,
        };

        const { exit } = proposal;
        const [exitKind] = Object.getOwnPropertyNames(exit);

        /** @type {CompleteObj | undefined} */
        let completeObj;
        const completeOffer = () => {
          return completeOffers(harden([offerHandle]), zoeForZcf);
        };

        if (exitKind === 'afterDeadline') {
          // Automatically complete offer after deadline.
          E(exit.afterDeadline.timer).setWakeup(
            exit.afterDeadline.deadline,
            harden({
              wake: () => completeOffer(),
            }),
          );
        } else if (exitKind === 'onDemand') {
          // Add to offerResult an object with a complete() method to support
          // complete offer on demand. Note: we cannot add the `completeOffer`
          // function directly to the offerResult because our marshalling layer
          // only allows two kinds of objects: records (no methods and only
          // data) and presences (local proxies for objects that may have
          // methods).
          completeObj = {
            complete: () => completeOffer(),
          };
        } else {
          // if exitRule.kind is 'waived' the user has no ability to complete
          // on demand
          assert(
            exitKind === 'waived',
            details`exit kind was not recognized: ${q(exitKind)}`,
          );
        }
        offerTable.create(offerRecord, offerHandle);
        return completeObj;
      },
    });

  /**
   * Makes a contract instance from an installation and returns a
   * unique handle for the instance that can be shared, as well as
   * other information, such as the terms used in the instance.
   *
   * @type {StartContract}
   */
  const startContract = params => {
    const contractCode = evalContractBundle(params.bundle);

    const { issuerKeywordRecord } = params.instanceData;
    const issuersP = Object.getOwnPropertyNames(issuerKeywordRecord).map(
      keyword => issuerKeywordRecord[keyword],
    );

    // invoke contract and return inner facet to Zoe.
    const invokeContract = () => {
      const contractFacet = makeContractFacet(
        params.zoeService,
        // copy so we can update brands and keywords
        { ...params.instanceData },
        params.inviteIssuer,
        params.zoeForZcf,
      );
      /** @type {Promise<Invite>} */
      const inviteP = E(contractCode).makeContract(contractFacet);
      return {
        inviteP,
        zcfForZoe: makeZcfForZoe(
          params.instanceData.instanceHandle,
          params.zoeForZcf,
        ),
      };
    };

    // The issuers may not have been seen before, so we must wait for
    // the issuer records to be available synchronously
    return issuerTable
      .getPromiseForIssuerRecords(issuersP)
      .then(invokeContract);
  };

  return harden({ startContract });
}

harden(buildRootObject);
