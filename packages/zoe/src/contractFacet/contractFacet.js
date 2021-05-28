// @ts-check

// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

import { assert, details as X, makeAssert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { AssetKind, AmountMath } from '@agoric/ertp';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { cleanProposal } from '../cleanProposal';
import { evalContractBundle } from './evalContractCode';
import { makeExitObj } from './exit';
import { makeHandle } from '../makeHandle';
import { makeIssuerStorage } from '../issuerStorage';
import { makeIssuerRecord } from '../issuerRecord';
import { createSeatManager } from './zcfSeat';
import { makeInstanceRecordStorage } from '../instanceRecordStorage';
import { handlePWarning, handlePKitWarning } from '../handleWarning';
import { makeOfferHandlerStorage } from './offerHandlerStorage';

import '../../exported';
import '../internal-types';

export function buildRootObject(powers, _params, testJigSetter = undefined) {
  /** @type {ExecuteContract} */
  const executeContract = async (
    bundle,
    zoeService,
    invitationIssuer,
    zoeInstanceAdmin,
    instanceRecordFromZoe,
    issuerStorageFromZoe,
  ) => {
    const {
      storeIssuerRecord,
      getAssetKindByBrand,
      getBrandForIssuer,
      getIssuerForBrand,
      instantiate: instantiateIssuerStorage,
    } = makeIssuerStorage();
    instantiateIssuerStorage(issuerStorageFromZoe);

    const {
      makeZCFSeat,
      reallocate,
      reallocateInternal,
      dropAllReferences,
    } = createSeatManager(zoeInstanceAdmin, getAssetKindByBrand);

    const { storeOfferHandler, takeOfferHandler } = makeOfferHandlerStorage();

    // Make the instanceRecord
    const {
      addIssuerToInstanceRecord,
      getTerms,
      assertUniqueKeyword,
      instantiate: instantiateInstanceRecordStorage,
    } = makeInstanceRecordStorage();
    instantiateInstanceRecordStorage(instanceRecordFromZoe);

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

      const empty = AmountMath.makeEmpty(mintyBrand, assetKind);
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
          // No effects above. COMMIT POINT. The following two steps
          // *should* be committed atomically, but it is not a
          // disaster if they are not. If we minted only, no one would
          // ever get those invisibly-minted assets.
          E(zoeMintP).mintAndEscrow(totalToMint);
          reallocateInternal([zcfSeat]);
          return zcfSeat;
        },
        burnLosses: (losses, zcfSeat) => {
          assertAmountKeywordRecord(losses, 'losses');
          const totalToBurn = Object.values(losses).reduce(add, empty);
          zcfSeat.decrementBy(losses);
          // verifies offer safety
          assert(zcfSeat.isOfferSafe(zcfSeat.getStagedAllocation()));
          // No effects above. Commit point. The following two steps
          // *should* be committed atomically, but it is not a
          // disaster if they are not. If we only commit the
          // stagedAllocation no one would ever get the unburned
          // assets.
          reallocateInternal([zcfSeat]);
          E(zoeMintP).withdrawAndBurn(totalToBurn);
        },
      });
      return zcfMint;
    };

    const shutdownWithFailure = reason => {
      E(zoeInstanceAdmin).failAllSeats(reason);
      dropAllReferences();
      powers.exitVatWithFailure(reason);
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
        powers.exitVat(completion);
      },
      shutdownWithFailure,
      assert: makeAssert(shutdownWithFailure),
      stopAcceptingOffers: () => E(zoeInstanceAdmin).stopAcceptingOffers(),
      makeZCFMint,
      makeEmptySeatKit,

      // The methods below are pure and have no side-effects //
      getZoeService: () => zoeService,
      getInvitationIssuer: () => invitationIssuer,
      getTerms,
      getBrandForIssuer,
      getIssuerForBrand,
      getAssetKind: getAssetKindByBrand,
      /**
       * Provide a jig object for testing purposes only.
       *
       * The contract code provides a callback whose return result will
       * be made available to the test that started this contract. The
       * supplied callback will only be called in a testing context,
       * never in production; i.e., it is only called if `testJigSetter`
       * was supplied.
       *
       * If no, \testFn\ is supplied, then an empty jig will be used.
       * An additional `zcf` property set to the current ContractFacet
       * will be appended to the returned jig object (overriding any
       * provided by the `testFn`).
       *
       * @type {SetTestJig}
       */
      setTestJig: (testFn = () => ({})) => {
        if (testJigSetter) {
          console.warn('TEST ONLY: capturing test data', testFn);
          testJigSetter({ ...testFn(), zcf });
        }
      },
    });

    // handleOfferObject gives Zoe the ability to notify ZCF when a new seat is
    // added in offer(). ZCF responds with the exitObj and offerResult.
    /** @type {HandleOfferObj} */
    const handleOfferObj = Far('handleOfferObj', {
      handleOffer: (invitationHandle, zoeSeatAdmin, seatData) => {
        const zcfSeat = makeZCFSeat(zoeSeatAdmin, seatData);
        const offerHandler = takeOfferHandler(invitationHandle);
        const offerResultP = E(offerHandler)(zcfSeat).catch(reason => {
          if (reason === undefined) {
            const newErr = new Error(
              `If an offerHandler throws, it must provide a reason of type Error, but the reason was undefined. Please fix the contract code to specify a reason for throwing.`,
            );
            throw zcfSeat.fail(newErr);
          }
          throw zcfSeat.fail(reason);
        });
        const exitObj = makeExitObj(seatData.proposal, zcfSeat);
        /** @type {HandleOfferResult} */
        return harden({ offerResultP, exitObj });
      },
    });

    // First, evaluate the contract code bundle.
    const contractCode = evalContractBundle(bundle);
    handlePWarning(contractCode);

    // Next, execute the contract code, passing in zcf
    /** @type {Promise<ExecuteContractResult>} */
    const result = E(contractCode)
      .start(zcf)
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
  };

  return Far('executeContract', { executeContract });
}

harden(buildRootObject);
