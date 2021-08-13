// @ts-check

import { assert, details as X, makeAssert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { AssetKind, AmountMath } from '@agoric/ertp';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { cleanProposal } from '../cleanProposal.js';
import { evalContractBundle } from './evalContractCode.js';
import { makeExitObj } from './exit.js';
import { makeHandle } from '../makeHandle.js';
import { makeIssuerStorage } from '../issuerStorage.js';
import { makeIssuerRecord } from '../issuerRecord.js';
import { createSeatManager } from './zcfSeat.js';
import { makeInstanceRecordStorage } from '../instanceRecordStorage.js';
import { handlePWarning, handlePKitWarning } from '../handleWarning.js';
import { makeOfferHandlerStorage } from './offerHandlerStorage.js';

import '../../exported.js';
import '../internal-types.js';

import '@agoric/swingset-vat/src/types.js';

/** @type {MakeZCFZygote} */
export const makeZCFZygote = (
  powers,
  zoeService,
  invitationIssuer,
  testJigSetter,
) => {
  /** @type {PromiseRecord<ZoeInstanceAdmin>} */
  const zoeInstanceAdminPromiseKit = makePromiseKit();
  const zoeInstanceAdmin = zoeInstanceAdminPromiseKit.promise;

  const {
    storeIssuerRecord,
    getAssetKindByBrand,
    getBrandForIssuer,
    getIssuerForBrand,
    instantiate: instantiateIssuerStorage,
  } = makeIssuerStorage();

  /** @type {ShutdownWithFailure} */
  const shutdownWithFailure = reason => {
    E(zoeInstanceAdmin).failAllSeats(reason);
    // eslint-disable-next-line no-use-before-define
    dropAllReferences();
    // @ts-ignore powers is not typed correctly:
    // https://github.com/Agoric/agoric-sdk/issues/3239
    powers.exitVatWithFailure(reason);
  };

  const {
    makeZCFSeat,
    reallocate,
    reallocateInternal,
    dropAllReferences,
  } = createSeatManager(
    zoeInstanceAdmin,
    getAssetKindByBrand,
    shutdownWithFailure,
  );

  const { storeOfferHandler, takeOfferHandler } = makeOfferHandlerStorage();

  // Make the instanceRecord
  const {
    addIssuerToInstanceRecord,
    getTerms,
    assertUniqueKeyword,
    getInstanceRecord,
    instantiate: instantiateInstanceRecordStorage,
  } = makeInstanceRecordStorage();

  const recordIssuer = (keyword, issuerRecord) => {
    addIssuerToInstanceRecord(keyword, issuerRecord);
    storeIssuerRecord(issuerRecord);
  };

  const makeEmptySeatKit = (exit = undefined) => {
    const initialAllocation = harden({});
    const proposal = cleanProposal(harden({ exit }), getAssetKindByBrand);
    const { notifier, updater } = makeNotifierKit();
    /** @type {PromiseRecord<ZoeSeatAdmin>} */
    const zoeSeatAdminPromiseKit = makePromiseKit();
    handlePKitWarning(zoeSeatAdminPromiseKit);
    const userSeatPromiseKit = makePromiseKit();
    handlePKitWarning(userSeatPromiseKit);
    const seatHandle = makeHandle('SeatHandle');

    const seatData = harden({
      proposal,
      initialAllocation,
      notifier,
      seatHandle,
    });
    const zcfSeat = makeZCFSeat(zoeSeatAdminPromiseKit.promise, seatData);

    const exitObj = makeExitObj(seatData.proposal, zcfSeat);

    E(zoeInstanceAdmin)
      .makeNoEscrowSeat(initialAllocation, proposal, exitObj, seatHandle)
      .then(({ zoeSeatAdmin, notifier: zoeNotifier, userSeat }) => {
        observeNotifier(zoeNotifier, updater);
        zoeSeatAdminPromiseKit.resolve(zoeSeatAdmin);
        userSeatPromiseKit.resolve(userSeat);
      });

    return { zcfSeat, userSeat: userSeatPromiseKit.promise };
  };

  const assertAmountKeywordRecord = (amountKeywordRecord, name) => {
    assert.typeof(
      amountKeywordRecord,
      'object',
      X`${name} ${amountKeywordRecord} must be an amountKeywordRecord`,
    );
    assert(amountKeywordRecord !== null, X`${name} cannot be null`);
  };

  // A helper for the code shared between MakeZCFMint and RegisterZCFMint
  const doMakeZCFMint = async (keyword, zoeMintP) => {
    const {
      brand: mintyBrand,
      issuer: mintyIssuer,
      displayInfo: mintyDisplayInfo,
    } = await E(zoeMintP).getIssuerRecord();
    // AWAIT
    const mintyIssuerRecord = makeIssuerRecord(
      mintyBrand,
      mintyIssuer,
      mintyDisplayInfo,
    );
    recordIssuer(keyword, mintyIssuerRecord);

    const empty = AmountMath.makeEmpty(mintyBrand, mintyDisplayInfo.assetKind);
    const add = (total, amountToAdd) => {
      return AmountMath.add(total, amountToAdd, mintyBrand);
    };

    /** @type {ZCFMint} */
    const zcfMint = Far('zcfMint', {
      getIssuerRecord: () => {
        return mintyIssuerRecord;
      },
      mintGains: (gains, zcfSeat = undefined) => {
        assertAmountKeywordRecord(gains, 'gains');
        if (zcfSeat === undefined) {
          zcfSeat = makeEmptySeatKit().zcfSeat;
        }
        const totalToMint = Object.values(gains).reduce(add, empty);
        zcfSeat.incrementBy(gains);
        // verifies offer safety
        assert(zcfSeat.isOfferSafe(zcfSeat.getStagedAllocation()));
        // No effects above. The following two steps
        // *should* be committed atomically, but it is not a
        // disaster if they are not. If we minted only, no one would
        // ever get those invisibly-minted assets.
        E(zoeMintP).mintAndEscrow(totalToMint);
        // Note COMMIT POINT within reallocateInternal.
        reallocateInternal([zcfSeat]);
        return zcfSeat;
      },
      burnLosses: (losses, zcfSeat) => {
        assertAmountKeywordRecord(losses, 'losses');
        const totalToBurn = Object.values(losses).reduce(add, empty);
        zcfSeat.decrementBy(losses);
        // verifies offer safety
        assert(zcfSeat.isOfferSafe(zcfSeat.getStagedAllocation()));
        // No effects above.
        // Note COMMIT POINT within reallocateInternal.
        // The following two steps
        // *should* be committed atomically, but it is not a disaster
        // if they are not. If we only commit the stagedAllocation no
        // one would ever get the unburned assets.
        reallocateInternal([zcfSeat]);
        E(zoeMintP).withdrawAndBurn(totalToBurn);
      },
    });
    return zcfMint;
  };

  /** @type {MakeZCFMint} */
  const makeZCFMint = async (
    keyword,
    assetKind = AssetKind.NAT,
    displayInfo,
  ) => {
    assertUniqueKeyword(keyword);

    const zoeMintP = E(zoeInstanceAdmin).makeZoeMint(
      keyword,
      assetKind,
      displayInfo,
    );

    return doMakeZCFMint(keyword, zoeMintP);
  };

  /** @type {ZCFRegisterFeeMint} */
  const registerFeeMint = async (keyword, feeMintAccess) => {
    assertUniqueKeyword(keyword);

    const zoeMintP = E(zoeInstanceAdmin).registerFeeMint(
      keyword,
      feeMintAccess,
    );
    return doMakeZCFMint(keyword, zoeMintP);
  };

  /** @type {ContractFacet} */
  const zcf = Far('zcf', {
    reallocate,
    assertUniqueKeyword,
    saveIssuer: async (issuerP, keyword) => {
      // TODO: The checks of the keyword for uniqueness are
      // duplicated. Assess how waiting on promises to resolve might
      // affect those checks and see if one can be removed.
      assertUniqueKeyword(keyword);
      const record = await E(zoeInstanceAdmin).saveIssuer(issuerP, keyword);
      // AWAIT ///
      recordIssuer(keyword, record);
      return record;
    },
    makeInvitation: (
      offerHandler = () => {},
      description,
      customProperties = harden({}),
    ) => {
      assert.typeof(
        description,
        'string',
        X`invitations must have a description string: ${description}`,
      );

      const invitationHandle = storeOfferHandler(offerHandler);
      /** @type {Promise<Payment>} */
      const invitationP = E(zoeInstanceAdmin).makeInvitation(
        invitationHandle,
        description,
        customProperties,
      );
      return invitationP;
    },
    // Shutdown the entire vat and give payouts
    shutdown: completion => {
      E(zoeInstanceAdmin).exitAllSeats(completion);
      dropAllReferences();
      // @ts-ignore powers is not typed correctly: https://github.com/Agoric/agoric-sdk/issues/3239s
      powers.exitVat(completion);
    },
    shutdownWithFailure,
    assert: makeAssert(shutdownWithFailure),
    stopAcceptingOffers: () => E(zoeInstanceAdmin).stopAcceptingOffers(),
    makeZCFMint,
    registerFeeMint,
    makeEmptySeatKit,

    // The methods below are pure and have no side-effects //
    getZoeService: () => zoeService,
    getInvitationIssuer: () => invitationIssuer,
    getTerms,
    getBrandForIssuer,
    getIssuerForBrand,
    getAssetKind: getAssetKindByBrand,
    /** @type {SetTestJig} */
    setTestJig: (testFn = () => ({})) => {
      if (testJigSetter) {
        console.warn('TEST ONLY: capturing test data', testFn);
        testJigSetter({ ...testFn(), zcf });
      }
    },
    getInstance: () => getInstanceRecord().instance,
  });

  // handleOfferObject gives Zoe the ability to notify ZCF when a new seat is
  // added in offer(). ZCF responds with the exitObj and offerResult.
  /** @type {HandleOfferObj} */
  const handleOfferObj = Far('handleOfferObj', {
    handleOffer: (invitationHandle, zoeSeatAdmin, seatData) => {
      const zcfSeat = makeZCFSeat(zoeSeatAdmin, seatData);
      const offerHandler = takeOfferHandler(invitationHandle);
      const offerResultP = E(offerHandler)(zcfSeat, seatData.offerArgs).catch(
        reason => {
          if (reason === undefined) {
            const newErr = new Error(
              `If an offerHandler throws, it must provide a reason of type Error, but the reason was undefined. Please fix the contract code to specify a reason for throwing.`,
            );
            throw zcfSeat.fail(newErr);
          }
          throw zcfSeat.fail(reason);
        },
      );
      const exitObj = makeExitObj(seatData.proposal, zcfSeat);
      /** @type {HandleOfferResult} */
      return harden({ offerResultP, exitObj });
    },
  });

  let contractCode;

  /** @type {ZCFZygote} */
  const zcfZygote = {
    evaluateContract: bundle => {
      contractCode = evalContractBundle(bundle);
      handlePWarning(contractCode);
    },
    startContract: (
      instanceAdminFromZoe,
      instanceRecordFromZoe,
      issuerStorageFromZoe,
      privateArgs = undefined,
    ) => {
      zoeInstanceAdminPromiseKit.resolve(instanceAdminFromZoe);
      instantiateInstanceRecordStorage(instanceRecordFromZoe);
      instantiateIssuerStorage(issuerStorageFromZoe);

      // Next, execute the contract code, passing in zcf
      /** @type {Promise<ExecuteContractResult>} */
      const result = E(contractCode)
        .start(zcf, privateArgs)
        .then(
          ({
            creatorFacet = Far('emptyCreatorFacet', {}),
            publicFacet = Far('emptyPublicFacet', {}),
            creatorInvitation = undefined,
          }) => {
            return harden({
              creatorFacet,
              publicFacet,
              creatorInvitation,
              handleOfferObj,
            });
          },
        );
      handlePWarning(result);
      return result;
    },
  };
  return harden(zcfZygote);
};
