// @ts-check

// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { isOfferSafe } from './offerSafety';
import { areRightsConserved } from './rightsConservation';
import { assertKeywordName, getKeywords } from './cleanProposal';
import { makeContractTables } from './state';
import { filterObj, filterFillAmounts, tuple } from './objArrayConversion';
import { evalContractBundle } from './evalContractCode';

import '../exported';
import './internal-types';

/**
 * Create the contract facet.
 *
 * @returns {{ startContract: StartContract }} The returned instance
 */
export function buildRootObject(_vatPowers) {
  // Need to make this variable a tuple type, since technically
  // it could be mutated before we pass it to filterObj.
  //
  // If we want to avoid this type magic, just supply it as the
  // verbatim argument of filterObj.
  const visibleInstanceRecordFields = tuple(
    'handle',
    'installationHandle',
    'publicAPI',
    'terms',
    'issuerKeywordRecord',
    'brandKeywordRecord',
  );
  /**
   * @param {InstanceRecord & ZcfInstanceRecord} instanceRecord
   */
  const visibleInstanceRecord = instanceRecord =>
    filterObj(instanceRecord, visibleInstanceRecordFields);

  const { offerTable, issuerTable } = makeContractTables();

  const getAmountMathForBrand = brand => issuerTable.get(brand).amountMath;

  const assertOffersAreActive = candidateOfferHandles =>
    candidateOfferHandles.forEach(offerHandle =>
      assert(offerTable.has(offerHandle), details`Offer is not active`),
    );

  /** @param {OfferRecord & PrivateOfferRecord} offerRecord */
  const removeAmountsAndNotifier = offerRecord =>
    filterObj(offerRecord, ['handle', 'instanceHandle', 'proposal']);
  /** @param {IssuerRecord & PrivateIssuerRecord} issuerRecord */
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

  /**
   * Create the contract-facing Zoe facet.
   *
   * @param {ZoeService} zoeService
   * @param {InstanceRecord & ZcfInstanceRecord} instanceRecord
   * @param {Issuer} inviteIssuer
   * @param {ZoeForZcf} zoeForZcf
   * @returns {ContractFacet}
   */
  const makeContractFacet = (
    zoeService,
    instanceRecord,
    inviteIssuer,
    zoeForZcf,
  ) => {
    let publicApiInitialized = false;

    /** @type {ContractFacet} */
    const contractFacet = {
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

      getOfferNotifier: offerHandle =>
        E(zoeService).getOfferNotifier(offerHandle),

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
      getVatAdmin: () => instanceRecord.adminNode,
    };
    return harden(contractFacet);
  };

  /**
   * @returns {ZcfForZoe}
   */
  const makeZcfForZoe = (instanceHandle, zoeForZcf) => {
    /** @type {ZcfForZoe} */
    const zcfForZoe = {
      addOffer: (offerHandle, proposal, allocation) => {
        /** @type {Updater<Allocation>} */
        const ignoringUpdater = {
          updateState: _ => {},
          finish: _ => {},
          reject: _ => {},
        };
        harden(ignoringUpdater);

        /** @type {Omit<OfferRecord & PrivateOfferRecord, 'handle'>} */
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
          assert(exit.afterDeadline);
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
    };
    return harden(zcfForZoe);
  };

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
      /** @type {Promise<Invite<any>>} */
      const inviteP = E(contractCode).makeContract(contractFacet);
      return {
        inviteP,
        zcfForZoe: makeZcfForZoe(params.instanceData.handle, params.zoeForZcf),
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
