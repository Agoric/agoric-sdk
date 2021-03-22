// @ts-check

/* global makeWeakStore */

// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

import { assert, details as X, q, makeAssert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';
import { Far } from '@agoric/marshal';

import { MathKind, amountMath, makeAmountMath } from '@agoric/ertp';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';
import { assertRightsConserved } from './rightsConservation';
import { makeIssuerTable } from '../issuerTable';
import {
  assertKeywordName,
  getKeywords,
  cleanProposal,
} from '../cleanProposal';
import { evalContractBundle } from './evalContractCode';
import { makeZcfSeatAdminKit } from './seat';
import { makeExitObj } from './exit';
import { objectMap } from '../objArrayConversion';
import { makeHandle } from '../makeHandle';

import '../../exported';
import '../internal-types';

export function buildRootObject(powers, _params, testJigSetter = undefined) {
  /** @type {ExecuteContract} */
  const executeContract = async (
    bundle,
    zoeService,
    invitationIssuer,
    zoeInstanceAdmin,
    instanceRecord,
  ) => {
    /** @type {IssuerTable} */
    const issuerTable = makeIssuerTable();
    const getAmountMath = brand => issuerTable.getByBrand(brand).amountMath;

    const getMathKindByBrand = brand => issuerTable.getByBrand(brand).mathKind;

    /** @type {WeakStore<InvitationHandle, (seat: ZCFSeat) => unknown>} */
    const invitationHandleToHandler = makeWeakStore('invitationHandle');

    /** @type {Store<ZCFSeat,ZCFSeatAdmin>} */
    const zcfSeatToZCFSeatAdmin = makeStore('zcfSeat');
    /** @type {WeakStore<ZCFSeat,SeatHandle>} */
    const zcfSeatToSeatHandle = makeWeakStore('zcfSeat');

    const keywords = Object.keys(instanceRecord.terms.issuers);
    const issuers = Object.values(instanceRecord.terms.issuers);

    const initIssuers = issuersP =>
      Promise.all(issuersP.map(issuerTable.initIssuer));

    /** @type {RegisterIssuerRecord} */
    const registerIssuerRecord = (keyword, issuerRecord) => {
      instanceRecord = {
        ...instanceRecord,
        terms: {
          ...instanceRecord.terms,
          issuers: {
            ...instanceRecord.terms.issuers,
            [keyword]: issuerRecord.issuer,
          },
          brands: {
            ...instanceRecord.terms.brands,
            [keyword]: issuerRecord.brand,
          },
          maths: {
            ...instanceRecord.terms.maths,
            [keyword]: issuerRecord.amountMath,
          },
        },
      };

      return issuerRecord;
    };

    /** @type {RegisterIssuerRecordWithKeyword} */
    const registerIssuerRecordWithKeyword = (keyword, issuerRecord) => {
      assertKeywordName(keyword);
      assert(
        !getKeywords(instanceRecord.terms.issuers).includes(keyword),
        X`keyword ${q(keyword)} must be unique`,
      );
      return registerIssuerRecord(keyword, issuerRecord);
    };

    const issuerRecords = await initIssuers(issuers);
    issuerRecords.forEach((issuerRecord, i) => {
      registerIssuerRecord(keywords[i], issuerRecord);
    });

    const allSeatStagings = new WeakSet();

    /**
     * Unlike the zcf.reallocate method, this one does not check conservation,
     * and so can be used internally for reallocations that violate
     * conservation.
     *
     * @param {SeatStaging[]} seatStagings
     */
    const reallocateInternal = seatStagings => {
      // Keep track of seats used so far in this call, to prevent aliasing.
      const seatsSoFar = new WeakSet();

      seatStagings.forEach(seatStaging => {
        assert(
          allSeatStagings.has(seatStaging),
          X`The seatStaging ${seatStaging} was not recognized`,
        );
        const seat = seatStaging.getSeat();
        assert(
          !seatsSoFar.has(seat),
          X`Seat (${seat}) was already an argument to reallocate`,
        );
        seatsSoFar.add(seat);
      });

      // No side effects above. All conditions checked which could have
      // caused us to reject this reallocation.
      // COMMIT POINT
      // All the effects below must succeed "atomically". Scare quotes because
      // the eventual send at the bottom is part of this "atomicity" even
      // though its effects happen later. The send occurs in the order of
      // updates from zcf to zoe, its effects must occur immediately in zoe
      // on reception, and must not fail.
      //
      // Commit the staged allocations (currentAllocation is replaced
      // for each of the seats) and inform Zoe of the
      // newAllocation.

      seatStagings.forEach(seatStaging =>
        zcfSeatToZCFSeatAdmin.get(seatStaging.getSeat()).commit(seatStaging),
      );
      const seatHandleAllocations = seatStagings.map(seatStaging => {
        const zcfSeat = seatStaging.getSeat();
        const seatHandle = zcfSeatToSeatHandle.get(zcfSeat);
        return { seatHandle, allocation: zcfSeat.getCurrentAllocation() };
      });
      E(zoeInstanceAdmin).replaceAllocations(seatHandleAllocations);
    };

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
      });
      const { zcfSeat, zcfSeatAdmin } = makeZcfSeatAdminKit(
        allSeatStagings,
        zoeSeatAdminPromiseKit.promise,
        seatData,
        getMathKindByBrand,
      );
      zcfSeatToZCFSeatAdmin.init(zcfSeat, zcfSeatAdmin);
      zcfSeatToSeatHandle.init(zcfSeat, seatHandle);

      const exitObj = makeExitObj(
        seatData.proposal,
        zoeSeatAdminPromiseKit.promise,
        zcfSeatAdmin,
      );

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
      assert(
        !(keyword in instanceRecord.terms.issuers),
        X`Keyword ${keyword} already registered`,
      );

      const zoeMintP = E(zoeInstanceAdmin).makeZoeMint(
        keyword,
        amountMathKind,
        displayInfo,
      );
      const { brand: mintyBrand, issuer: mintyIssuer } = await E(
        zoeMintP,
      ).getIssuerRecord();
      // AWAIT
      const mintyAmountMath = makeAmountMath(mintyBrand, amountMathKind);
      const mintyIssuerRecord = harden({
        brand: mintyBrand,
        issuer: mintyIssuer,
        amountMath: mintyAmountMath,
        mathKind: amountMathKind,
      });
      registerIssuerRecordWithKeyword(keyword, mintyIssuerRecord);
      issuerTable.initIssuerByRecord(mintyIssuerRecord);

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
      zcfSeatToZCFSeatAdmin.entries().forEach(([zcfSeat, zcfSeatAdmin]) => {
        if (!zcfSeat.hasExited()) {
          zcfSeatAdmin.updateHasExited();
        }
      });
      powers.exitVatWithFailure(reason);
    };

    /** @type {ContractFacet} */
    const zcf = Far('zcf', {
      reallocate: (/** @type {SeatStaging[]} */ ...seatStagings) => {
        // We may want to handle this with static checking instead.
        // Discussion at: https://github.com/Agoric/agoric-sdk/issues/1017
        assert(
          seatStagings.length >= 2,
          X`reallocating must be done over two or more seats`,
        );

        // Ensure that rights are conserved overall. Offer safety was
        // already checked when an allocation was staged for an individual seat.
        const flattenAllocations = allocations =>
          allocations.flatMap(Object.values);

        const previousAllocations = seatStagings.map(seatStaging =>
          seatStaging.getSeat().getCurrentAllocation(),
        );
        const previousAmounts = flattenAllocations(previousAllocations);

        const newAllocations = seatStagings.map(seatStaging =>
          seatStaging.getStagedAllocation(),
        );
        const newAmounts = flattenAllocations(newAllocations);

        assertRightsConserved(previousAmounts, newAmounts);

        reallocateInternal(seatStagings);
      },
      assertUniqueKeyword: keyword => {
        assertKeywordName(keyword);
        assert(
          !getKeywords(instanceRecord.terms.issuers).includes(keyword),
          X`keyword ${q(keyword)} must be unique`,
        );
      },
      saveIssuer: async (issuerP, keyword) => {
        // TODO: The checks of the keyword for uniqueness are
        // duplicated. Assess how waiting on promises to resolve might
        // affect those checks and see if one can be removed.
        zcf.assertUniqueKeyword(keyword);
        await E(zoeInstanceAdmin).saveIssuer(issuerP, keyword);
        // AWAIT ///
        const record = await issuerTable.initIssuer(issuerP);
        // AWAIT ///
        return registerIssuerRecordWithKeyword(keyword, record);
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
        zcfSeatToZCFSeatAdmin.entries().forEach(([zcfSeat, zcfSeatAdmin]) => {
          if (!zcfSeat.hasExited()) {
            zcfSeatAdmin.updateHasExited();
          }
        });
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
      getTerms: () => instanceRecord.terms,
      getBrandForIssuer: issuer => issuerTable.getByIssuer(issuer).brand,
      getIssuerForBrand: brand => issuerTable.getByBrand(brand).issuer,
      getAmountMath,
      getMathKind: brand => issuerTable.getByBrand(brand).mathKind,
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
      addSeat: (invitationHandle, zoeSeatAdmin, seatData, seatHandle) => {
        const { zcfSeatAdmin, zcfSeat } = makeZcfSeatAdminKit(
          allSeatStagings,
          zoeSeatAdmin,
          seatData,
          getMathKindByBrand,
        );
        zcfSeatToZCFSeatAdmin.init(zcfSeat, zcfSeatAdmin);
        zcfSeatToSeatHandle.init(zcfSeat, seatHandle);
        const offerHandler = invitationHandleToHandler.get(invitationHandle);
        const offerResultP = E(offerHandler)(zcfSeat).catch(reason => {
          throw zcfSeat.fail(reason);
        });
        const exitObj = makeExitObj(
          seatData.proposal,
          zoeSeatAdmin,
          zcfSeatAdmin,
        );
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
