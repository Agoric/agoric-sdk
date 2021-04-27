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
import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { MathKind, amountMath } from '@agoric/ertp';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { cleanProposal } from '../cleanProposal';
import { evalContractBundle } from './evalContractCode';
import { makeExitObj } from './exit';
import { objectMap } from '../objArrayConversion';
import { makeHandle } from '../makeHandle';
import { makeIssuerStorage } from '../issuerStorage';
import { makeIssuerRecord } from '../issuerRecord';
import { createSeatManager } from './zcfSeat';
import { makeInstanceRecordStorage } from '../instanceRecordStorage';

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
      getMathKindByBrand,
      getBrandForIssuer,
      getIssuerForBrand,
    } = makeIssuerStorage(issuerStorageFromZoe);

    const {
      makeZCFSeat,
      reallocate,
      reallocateInternal,
      dropAllReferences,
    } = createSeatManager(zoeInstanceAdmin, getMathKindByBrand);

    /** @type {WeakStore<InvitationHandle, (seat: ZCFSeat) => unknown>} */
    const invitationHandleToHandler = makeNonVOWeakStore('invitationHandle');

    /** @type {WeakStore<ZCFSeat,SeatHandle>} */
    const zcfSeatToSeatHandle = makeNonVOWeakStore('zcfSeat');

    // Make the instanceRecord
    const {
      addIssuerToInstanceRecord,
      getTerms,
      assertUniqueKeyword,
    } = makeInstanceRecordStorage(instanceRecordFromZoe);

    const makeEmptySeatKit = (exit = undefined) => {
      const initialAllocation = harden({});
      const proposal = cleanProposal(harden({ exit }), getMathKindByBrand);
      const { notifier, updater } = makeNotifierKit();
      /** @type {PromiseRecord<ZoeSeatAdmin>} */
      const zoeSeatAdminPromiseKit = makePromiseKit();
      // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
      // This does not suppress any error messages.
      zoeSeatAdminPromiseKit.promise.catch(_ => {});
      const userSeatPromiseKit = makePromiseKit();
      // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
      // This does not suppress any error messages.
      userSeatPromiseKit.promise.catch(_ => {});
      const seatHandle = makeHandle('SeatHandle');

      const seatData = harden({
        proposal,
        initialAllocation,
        notifier,
        seatHandle,
      });
      const zcfSeat = makeZCFSeat(zoeSeatAdminPromiseKit.promise, seatData);
      zcfSeatToSeatHandle.init(zcfSeat, seatHandle);

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

    /** @type {MakeZCFMint} */
    const makeZCFMint = async (
      keyword,
      amountMathKind = MathKind.NAT,
      displayInfo,
    ) => {
      assertUniqueKeyword(keyword);

      const zoeMintP = E(zoeInstanceAdmin).makeZoeMint(
        keyword,
        amountMathKind,
        displayInfo,
      );
      const { brand: mintyBrand, issuer: mintyIssuer } = await E(
        zoeMintP,
      ).getIssuerRecord();
      // AWAIT
      const mintyIssuerRecord = makeIssuerRecord(
        mintyBrand,
        mintyIssuer,
        amountMathKind,
        displayInfo,
      );
      addIssuerToInstanceRecord(keyword, mintyIssuerRecord);
      storeIssuerRecord(mintyIssuerRecord);

      /** @type {ZCFMint} */
      const zcfMint = Far('zcfMint', {
        getIssuerRecord: () => {
          return mintyIssuerRecord;
        },
        mintGains: (gains, zcfSeat = undefined) => {
          assert.typeof(
            gains,
            'object',
            X`gains ${gains} must be an amountKeywordRecord`,
          );
          assert(gains !== null, X`gains cannot be null`);
          if (zcfSeat === undefined) {
            zcfSeat = makeEmptySeatKit().zcfSeat;
          }
          let totalToMint = amountMath.makeEmpty(mintyBrand, amountMathKind);
          const oldAllocation = zcfSeat.getCurrentAllocation();
          const updates = objectMap(gains, ([seatKeyword, amountToAdd]) => {
            assert(
              totalToMint.brand === amountToAdd.brand,
              X`Only digital assets of brand ${totalToMint.brand} can be minted in this call. ${amountToAdd} has the wrong brand.`,
            );
            totalToMint = amountMath.add(totalToMint, amountToAdd);
            const oldAmount = oldAllocation[seatKeyword];
            // oldAmount being absent is equivalent to empty.
            const newAmount = oldAmount
              ? amountMath.add(oldAmount, amountToAdd)
              : amountToAdd;
            return [seatKeyword, newAmount];
          });
          const newAllocation = harden({
            ...oldAllocation,
            ...updates,
          });
          // verifies offer safety
          const seatStaging = zcfSeat.stage(newAllocation);
          // No effects above. COMMIT POINT. The following two steps
          // *should* be committed atomically, but it is not a
          // disaster if they are not. If we minted only, no one would
          // ever get those invisibly-minted assets.
          E(zoeMintP).mintAndEscrow(totalToMint);
          reallocateInternal([seatStaging]);
          return zcfSeat;
        },
        burnLosses: (losses, zcfSeat) => {
          assert.typeof(
            losses,
            'object',
            X`losses ${losses} must be an amountKeywordRecord`,
          );
          assert(losses !== null, X`losses cannot be null`);
          let totalToBurn = amountMath.makeEmpty(mintyBrand, amountMathKind);
          const oldAllocation = zcfSeat.getCurrentAllocation();
          const updates = objectMap(
            losses,
            ([seatKeyword, amountToSubtract]) => {
              assert(
                totalToBurn.brand === amountToSubtract.brand,
                X`Only digital assets of brand ${totalToBurn.brand} can be burned in this call. ${amountToSubtract} has the wrong brand.`,
              );
              totalToBurn = amountMath.add(totalToBurn, amountToSubtract);
              const oldAmount = oldAllocation[seatKeyword];
              const newAmount = amountMath.subtract(
                oldAmount,
                amountToSubtract,
              );
              return [seatKeyword, newAmount];
            },
          );
          const newAllocation = harden({
            ...oldAllocation,
            ...updates,
          });
          // verifies offer safety
          const seatStaging = zcfSeat.stage(newAllocation);
          // No effects above. Commit point. The following two steps
          // *should* be committed atomically, but it is not a
          // disaster if they are not. If we only commit the staging,
          // no one would ever get the unburned assets.
          reallocateInternal([seatStaging]);
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
        storeIssuerRecord(record);
        addIssuerToInstanceRecord(keyword, record);
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

        const invitationHandle = makeHandle('Invitation');
        invitationHandleToHandler.init(invitationHandle, offerHandler);
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
      getMathKind: getMathKindByBrand,
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

    // addSeatObject gives Zoe the ability to notify ZCF when a new seat is
    // added in offer(). ZCF responds with the exitObj and offerResult.
    /** @type {AddSeatObj} */
    const addSeatObj = Far('addSeatObj', {
      addSeat: (invitationHandle, zoeSeatAdmin, seatData) => {
        const zcfSeat = makeZCFSeat(zoeSeatAdmin, seatData);
        zcfSeatToSeatHandle.init(zcfSeat, seatData.seatHandle);
        const offerHandler = invitationHandleToHandler.get(invitationHandle);
        const offerResultP = E(offerHandler)(zcfSeat).catch(reason => {
          throw zcfSeat.fail(reason);
        });
        const exitObj = makeExitObj(seatData.proposal, zcfSeat);
        /** @type {AddSeatResult} */
        return harden({ offerResultP, exitObj });
      },
    });

    // First, evaluate the contract code bundle.
    const contractCode = evalContractBundle(bundle);
    // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
    // This does not suppress any error messages.
    contractCode.catch(() => {});

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
            addSeatObj,
          });
        },
      );
    // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
    // This does not suppress any error messages.
    result.catch(() => {});
    return result;
  };

  return Far('executeContract', { executeContract });
}

harden(buildRootObject);
