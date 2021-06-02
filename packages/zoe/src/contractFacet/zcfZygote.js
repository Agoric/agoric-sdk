// @ts-check

import { assert, details as X, makeAssert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import { evalContractBundle } from './evalContractCode';
import { makeExitObj } from './exit';
import { makeIssuerStorage } from '../issuerStorage';
import { createSeatManager } from './zcfSeat';
import { makeInstanceRecordStorage } from '../instanceRecordStorage';
import { makeOfferHandlerStorage } from './offerHandlerStorage';
import { setupMakeZCFMint } from './zcfMint';
import { setupMakeEmptySeatKit } from './emptySeat';

import '../../exported';
import '../internal-types';
import { handlePWarning } from '../handleWarning';

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

  const {
    makeZCFSeat,
    reallocate,
    reallocateInternal,
    dropAllReferences,
  } = createSeatManager(zoeInstanceAdmin, getAssetKindByBrand);

  // Make the instanceRecord
  const {
    addIssuerToInstanceRecord,
    getTerms,
    assertUniqueKeyword,
    instantiate: instantiateInstanceRecord,
  } = makeInstanceRecordStorage();

  const { storeOfferHandler, getOfferHandler } = makeOfferHandlerStorage();

  const recordIssuer = (keyword, issuerRecord) => {
    addIssuerToInstanceRecord(keyword, issuerRecord);
    storeIssuerRecord(issuerRecord);
  };

  const makeEmptySeatKit = setupMakeEmptySeatKit(
    zoeInstanceAdmin,
    makeZCFSeat,
    getAssetKindByBrand,
  );

  const makeZCFMint = setupMakeZCFMint(
    assertUniqueKeyword,
    zoeInstanceAdmin,
    recordIssuer,
    reallocateInternal,
    makeEmptySeatKit,
  );

  const shutdownWithFailure = reason => {
    E(zoeInstanceAdmin).failAllSeats(reason);
    dropAllReferences();
    powers.exitVatWithFailure(reason);
  };

  const saveIssuer = async (issuerP, keyword) => {
    // TODO: The checks of the keyword for uniqueness are
    // duplicated. Assess how waiting on promises to resolve might
    // affect those checks and see if one can be removed.
    assertUniqueKeyword(keyword);
    const record = await E(zoeInstanceAdmin).saveIssuer(issuerP, keyword);
    // AWAIT ///
    recordIssuer(keyword, record);
    return record;
  };

  /** @type {MakeInvitation} */
  const makeInvitation = (
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
  };

  // Shutdown the entire vat and give payouts
  const shutdown = completion => {
    E(zoeInstanceAdmin).exitAllSeats(completion);
    dropAllReferences();
    powers.exitVat(completion);
  };

  /** @type {ContractFacet} */
  const zcf = Far('zcf', {
    reallocate,
    assertUniqueKeyword,
    saveIssuer,
    makeInvitation,
    shutdown,
    shutdownWithFailure,
    assert: makeAssert(shutdownWithFailure),
    stopAcceptingOffers: () => E(zoeInstanceAdmin).stopAcceptingOffers(),
    makeZCFMint,
    makeEmptySeatKit,
    /** @type {SetTestJig} */
    setTestJig: (testFn = () => ({})) => {
      if (testJigSetter) {
        console.warn('TEST ONLY: capturing test data', testFn);
        testJigSetter({ ...testFn(), zcf });
      }
    },

    // The methods below are pure and have no side-effects //
    getZoeService: () => zoeService,
    getInvitationIssuer: () => invitationIssuer,
    getTerms,
    getBrandForIssuer,
    getIssuerForBrand,
    getAssetKind: getAssetKindByBrand,
  });

  // handleOfferObject gives Zoe the ability to notify ZCF when an
  // offer() call is made and a new ZCFSeat should be created. ZCF
  // responds with the exitObj and offerResult.
  /** @type {HandleOfferObj} */
  const handleOfferObj = Far('handleOfferObj', {
    handleOffer: (invitationHandle, zoeSeatAdmin, seatData) => {
      const zcfSeat = makeZCFSeat(zoeSeatAdmin, seatData);
      const offerHandler = getOfferHandler(invitationHandle);
      const offerResultP = E(offerHandler)(zcfSeat).catch(reason => {
        throw zcfSeat.fail(reason);
      });
      const exitObj = makeExitObj(seatData.proposal, zcfSeat);
      /** @type {HandleOfferResult} */
      return harden({ offerResultP, exitObj });
    },
  });

  let contractCode;

  return harden({
    evaluateContract: bundle => {
      contractCode = evalContractBundle(bundle);
      handlePWarning(contractCode);
    },
    startContract: (
      instanceAdminFromZoe,
      instanceRecordFromZoe,
      issuerStorageFromZoe,
    ) => {
      zoeInstanceAdminPromiseKit.resolve(instanceAdminFromZoe);
      instantiateInstanceRecord(instanceRecordFromZoe);
      instantiateIssuerStorage(issuerStorageFromZoe);

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
    },
  });
};
