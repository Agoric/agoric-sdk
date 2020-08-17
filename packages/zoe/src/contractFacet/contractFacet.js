// @ts-check

// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import makeWeakStore from '@agoric/weak-store';

import { makeAmountMath, MathKind } from '@agoric/ertp';
import { makeNotifierKit, updateFromNotifier } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';
import { areRightsConserved } from './rightsConservation';
import { makeIssuerTable } from '../issuerTable';
import {
  assertKeywordName,
  getKeywords,
  cleanProposal,
} from '../zoeService/cleanProposal';
import { evalContractBundle } from './evalContractCode';
import { makeZcfSeatAdminKit } from './seat';
import { makeExitObj } from './exit';
import { objectMap } from '../objArrayConversion';

import '../../exported';
import '../internal-types';

export function buildRootObject() {
  /** @type ExecuteContract */
  const executeContract = async (
    bundle,
    zoeService,
    invitationIssuer,
    zoeInstanceAdmin,
    instanceRecord,
  ) => {
    const issuerTable = makeIssuerTable();
    const getAmountMath = brand => issuerTable.get(brand).amountMath;

    const invitationHandleToHandler = makeWeakStore('invitationHandle');

    /** @type WeakStore<ZCFSeat,ZCFSeatAdmin> */
    const seatToZCFSeatAdmin = makeWeakStore('seat');

    const keywords = Object.keys(instanceRecord.terms.issuers);
    const issuers = Object.values(instanceRecord.terms.issuers);

    const getPromiseForIssuerRecords = issuersP =>
      Promise.all(issuersP.map(issuerTable.getPromiseForIssuerRecord));

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

    const registerIssuerRecordWithKeyword = (keyword, issuerRecord) => {
      assertKeywordName(keyword);
      assert(
        !getKeywords(instanceRecord.terms.issuers).includes(keyword),
        details`keyword ${keyword} must be unique`,
      );
      return registerIssuerRecord(keyword, issuerRecord);
    };

    const issuerRecords = await getPromiseForIssuerRecords(issuers);
    issuerRecords.forEach((issuerRecord, i) => {
      registerIssuerRecord(keywords[i], issuerRecord);
    });

    const allSeatStagings = new WeakSet();

    /** @type MakeZCFMint */
    const makeZCFMint = async (keyword, amountMathKind = MathKind.NAT) => {
      assert(
        !(keyword in instanceRecord.terms.issuers),
        details`Keyword ${keyword} already registered`,
      );

      const zoeMintP = E(zoeInstanceAdmin).makeZoeMint(keyword, amountMathKind);
      const { brand: mintyBrand, issuer: mintyIssuer } = await E(
        zoeMintP,
      ).getIssuerRecord();
      // AWAIT
      const mintyAmountMath = makeAmountMath(mintyBrand, amountMathKind);
      const mintyIssuerRecord = harden({
        brand: mintyBrand,
        issuer: mintyIssuer,
        amountMath: mintyAmountMath,
      });
      registerIssuerRecordWithKeyword(keyword, mintyIssuerRecord);
      issuerTable.initIssuerRecord(mintyIssuerRecord);

      /** @type ZCFMint */
      const zcfMint = harden({
        getIssuerRecord: () => {
          return mintyIssuerRecord;
        },
        mintGains: (gains, zcfSeat = undefined) => {
          assert(
            zcfSeat !== undefined,
            details`On demand seat creation not yet implemented`,
          );
          let totalToMint = mintyAmountMath.getEmpty();
          const oldAllocation = zcfSeat.getCurrentAllocation();
          const updates = objectMap(gains, ([seatKeyword, amountToAdd]) => {
            totalToMint = mintyAmountMath.add(totalToMint, amountToAdd);
            const oldAmount = oldAllocation[seatKeyword];
            // oldAmount being absent is equivalent to empty.
            const newAmount = oldAmount
              ? mintyAmountMath.add(oldAmount, amountToAdd)
              : amountToAdd;
            return [seatKeyword, newAmount];
          });
          const newAllocation = harden({
            ...oldAllocation,
            ...updates,
          });
          const zcfSeatAdmin = seatToZCFSeatAdmin.get(zcfSeat);
          // verifies offer safety
          const seatStaging = zcfSeat.stage(newAllocation);
          // No effects above. Commit point. The following two steps
          // *should* be committed atomically.
          // But unlike https://github.com/Agoric/agoric-sdk/issues/1391
          // it is not a disater if they are not.
          // If we minted only, no one would ever get those
          // invisibly-minted assets.
          E(zoeMintP).mintAndEscrow(totalToMint);
          zcfSeatAdmin.commit(seatStaging);
          return zcfSeat;
        },
        burnLosses: (losses, zcfSeat) => {
          let totalToBurn = mintyAmountMath.getEmpty();
          const oldAllocation = zcfSeat.getCurrentAllocation();
          const updates = objectMap(
            losses,
            ([seatKeyword, amountToSubtract]) => {
              totalToBurn = mintyAmountMath.add(totalToBurn, amountToSubtract);
              const oldAmount = oldAllocation[seatKeyword];
              const newAmount = mintyAmountMath.subtract(
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
          const zcfSeatAdmin = seatToZCFSeatAdmin.get(zcfSeat);
          // verifies offer safety
          const seatStaging = zcfSeat.stage(newAllocation);
          // No effects above. Commit point. The following two steps
          // *should* be committed atomically.
          // But unlike https://github.com/Agoric/agoric-sdk/issues/1391
          // it is not a disater if they are not.
          // If we only commit the staging, no one would ever get the
          // unburned assets.
          zcfSeatAdmin.commit(seatStaging);
          E(zoeMintP).withdrawAndBurn(totalToBurn);
        },
      });
      return zcfMint;
    };

    /** @type ContractFacet */
    const zcf = {
      reallocate: (/** @type SeatStaging[] */ ...seatStagings) => {
        // We may want to handle this with static checking instead.
        // Discussion at: https://github.com/Agoric/agoric-sdk/issues/1017
        assert(
          seatStagings.length >= 2,
          details`reallocating must be done over two or more seats`,
        );

        // Keep track of seats used so far in this call, to prevent aliasing.
        const seatsSoFar = new WeakSet();

        seatStagings.forEach(seatStaging => {
          assert(
            allSeatStagings.has(seatStaging),
            details`The seatStaging ${seatStaging} was not recognized`,
          );
          const seat = seatStaging.getSeat();
          assert(
            !seatsSoFar.has(seat),
            details`Seat (${seat}) was already an argument to reallocate`,
          );
          seatsSoFar.add(seat);
        });

        // Ensure that rights are conserved overall. Offer safety was
        // already checked when an allocation was staged for an individual seat.
        const flattened = arr => [].concat(...arr);
        const flattenAllocations = allocations =>
          flattened(allocations.map(allocation => Object.values(allocation)));

        const previousAllocations = seatStagings.map(seatStaging =>
          seatStaging.getSeat().getCurrentAllocation(),
        );
        const previousAmounts = flattenAllocations(previousAllocations);

        const newAllocations = seatStagings.map(seatStaging =>
          seatStaging.getStagedAllocation(),
        );
        const newAmounts = flattenAllocations(newAllocations);

        assert(
          areRightsConserved(getAmountMath, previousAmounts, newAmounts),
          details`Rights are not conserved in the proposed reallocation`,
        );

        // Commit the staged allocations and inform Zoe of the
        // newAllocation.
        seatStagings.forEach(seatStaging =>
          seatToZCFSeatAdmin.get(seatStaging.getSeat()).commit(seatStaging),
        );
      },
      assertUniqueKeyword: keyword => {
        assertKeywordName(keyword);
        assert(
          !getKeywords(instanceRecord.terms.issuers).includes(keyword),
          details`keyword ${keyword} must be unique`,
        );
      },
      saveIssuer: (issuerP, keyword) => {
        // TODO: The checks of the keyword for uniqueness are
        // duplicated. Assess how waiting on promises to resolve might
        // affect those checks and see if one can be removed.
        zcf.assertUniqueKeyword(keyword);
        return E(zoeInstanceAdmin)
          .saveIssuer(issuerP, keyword)
          .then(() => {
            return issuerTable
              .getPromiseForIssuerRecord(issuerP)
              .then(record => registerIssuerRecordWithKeyword(keyword, record));
          });
      },
      makeInvitation: (offerHandler, description, customProperties = {}) => {
        assert.typeof(
          description,
          'string',
          details`invitations must have a description string: ${description}`,
        );

        const invitationHandle = /** @type {InvitationHandle} */ (harden({}));
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
      shutdown: () => E(zoeInstanceAdmin).shutdown(),

      // The methods below are pure and have no side-effects //
      getZoeService: () => zoeService,
      getInvitationIssuer: () => invitationIssuer,
      getTerms: () => instanceRecord.terms,
      getBrandForIssuer: issuer =>
        issuerTable.getIssuerRecordByIssuer(issuer).brand,
      getAmountMath,
      makeZCFMint,
      makeEmptySeatKit: () => {
        const initialAllocation = harden({});
        const proposal = cleanProposal(getAmountMath, harden({}));
        const { notifier, updater } = makeNotifierKit();
        const zoeSeatAdminPromiseKit = makePromiseKit();
        const userSeatPromiseKit = makePromiseKit();

        E(zoeInstanceAdmin)
          .makeOfferlessSeat(initialAllocation, proposal)
          .then(({ zoeSeatAdmin, notifier: zoeNotifier, userSeat }) => {
            updateFromNotifier(updater, zoeNotifier);
            zoeSeatAdminPromiseKit.resolve(zoeSeatAdmin);
            userSeatPromiseKit.resolve(userSeat);
          });

        const seatData = harden({
          proposal,
          initialAllocation,
          notifier,
        });
        const { zcfSeat, zcfSeatAdmin } = makeZcfSeatAdminKit(
          allSeatStagings,
          zoeSeatAdminPromiseKit.promise,
          seatData,
          getAmountMath,
        );
        seatToZCFSeatAdmin.init(zcfSeat, zcfSeatAdmin);
        return { zcfSeat, userSeat: userSeatPromiseKit.promise };
      },
    };
    harden(zcf);

    // addSeatObject gives Zoe the ability to notify ZCF when a new seat is
    // added in offer(). ZCF responds with the exitObj and offerResult.
    /** @type AddSeatObj */
    const addSeatObj = {
      addSeat: (invitationHandle, zoeSeatAdmin, seatData) => {
        const { zcfSeatAdmin, zcfSeat } = makeZcfSeatAdminKit(
          allSeatStagings,
          zoeSeatAdmin,
          seatData,
          getAmountMath,
        );
        seatToZCFSeatAdmin.init(zcfSeat, zcfSeatAdmin);
        const offerHandler = invitationHandleToHandler.get(invitationHandle);
        // @ts-ignore
        const offerResultP = E(offerHandler)(zcfSeat).catch(err => {
          if (!zcfSeat.hasExited()) {
            zcfSeat.exit();
          }
          throw err;
        });
        const exitObj = makeExitObj(
          seatData.proposal,
          zoeSeatAdmin,
          zcfSeatAdmin,
        );
        /** @type AddSeatResult */
        return harden({ offerResultP, exitObj });
      },
    };
    harden(addSeatObj);

    // First, evaluate the contract code bundle.
    const contractCode = evalContractBundle(bundle);

    // Next, execute the contract code, passing in zcf and the terms
    /** @type {Promise<Invite>} */
    return E(contractCode)
      .start(zcf)
      .then(({ creatorFacet, publicFacet, creatorInvitation }) => {
        return harden({
          creatorFacet,
          publicFacet,
          creatorInvitation,
          addSeatObj,
        });
      });
  };

  return harden({ executeContract });
}

harden(buildRootObject);
