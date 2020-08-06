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

import { areRightsConserved } from './rightsConservation';
import { makeIssuerTable } from '../issuerTable';
import { assertKeywordName, getKeywords } from '../zoeService/cleanProposal';
import { evalContractBundle } from './evalContractCode';
import { makeSeatAdmin } from './seat';
import { makeExitObj } from './exit';

import '../../exported';
import '../internal-types';

export function buildRootObject() {
  /** @type ExecuteContract */
  const executeContract = async (
    bundle,
    zoeService,
    invitationIssuer,
    zoeInstanceAdmin,
    hardenedInstanceRecord,
  ) => {
    const instanceRecord = { ...hardenedInstanceRecord };
    const issuerTable = makeIssuerTable();
    const getAmountMath = brand => issuerTable.get(brand).amountMath;

    const invitationHandleToHandler = makeWeakStore('invitationHandle');
    const seatToZCFSeatAdmin = makeWeakStore('seat');

    const issuers = Object.values(instanceRecord.issuerKeywordRecord);

    const getPromiseForIssuerRecords = issuersP =>
      Promise.all(issuersP.map(issuerTable.getPromiseForIssuerRecord));

    await getPromiseForIssuerRecords(issuers);

    const allSeatStagings = new WeakSet();

    /** @type ContractFacet */
    const zcf = {
      reallocate: (/** @type SeatStaging[] */ ...seatStagings) => {
        // We may want to handle this with static checking instead.
        // Discussion at: https://github.com/Agoric/agoric-sdk/issues/1017
        assert(
          seatStagings.length >= 2,
          details`reallocating must be done over two or more seats`,
        );

        seatStagings.forEach(seatStaging =>
          assert(
            allSeatStagings.has(seatStaging),
            details`The seatStaging ${seatStaging} was not recognized`,
          ),
        );

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
      saveIssuer: (issuerP, keyword) => {
        return E(zoeInstanceAdmin)
          .saveIssuer(issuerP, keyword)
          .then(() => {
            return issuerTable
              .getPromiseForIssuerRecord(issuerP)
              .then(issuerRecord => {
                assertKeywordName(keyword);
                assert(
                  !getKeywords(instanceRecord.issuerKeywordRecord).includes(
                    keyword,
                  ),
                  details`keyword ${keyword} must be unique`,
                );
                instanceRecord.issuerKeywordRecord = {
                  ...instanceRecord.issuerKeywordRecord,
                  [keyword]: issuerRecord.issuer,
                };
                instanceRecord.brandKeywordRecord = {
                  ...instanceRecord.brandKeywordRecord,
                  [keyword]: issuerRecord.brand,
                };

                return issuerRecord;
              });
          });
      },
      makeInvitation: (offerHandler, description, customProperties = {}) => {
        assert.typeof(
          description,
          'string',
          details`invitations must have a description string: ${description}`,
        );
        /** @type {InvitationHandle} */
        const invitationHandle = {};
        harden(invitationHandle);
        invitationHandleToHandler.init(invitationHandle, offerHandler);
        /** @type {Promise<Payment<'ZoeInvitation'>>} */
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
      getInstanceRecord: () => harden({ ...instanceRecord }),
      getBrandForIssuer: issuer =>
        issuerTable.getIssuerRecordByIssuer(issuer).brand,
      getAmountMath,

      makeZCFMint: (keyword, mathHelperName = 'nat') => {
        const zoeMintP = E(zoeInstanceAdmin).makeZoeMint(
          keyword,
          mathHelperName,
        );
        const issuerRecordP = E(zoeMintP).getIssuerRecord();
        const zcfMint = harden({
          getIssuerRecord: () => {
            return issuerRecordP;
          },
          mintAllocation: (zcfSeat, seatKeyword, amount) => {
            // TODO local stuff
            const seatAdmin = seatToSeatAdmin.get(zcfSeat);
            E(zoeMintP).mintAllocation(seatAdmin, seatKeyword, amount);
          },
          stageGrant: oldAllocation => {
            const stagedSeat = undefined; // TODO
            E(zoeMintP).stageGrant(oldAllocation);
            return stagedSeat;
          },
          stageBurn: newAllocation => {
            const stagedSeat = undefined; // TODO
            E(zoeMintP).stageBurn(newAllocation);
            return stagedSeat;
          },
        });
        return zcfMint;
      },
    };
    harden(zcf);

    // To Zoe, we will return the invite and an object such that Zoe
    // can tell us about new seats.
    /** @type AddSeatObj */
    const addSeatObj = {
      addSeat: (invitationHandle, zoeSeatAdmin, seatData) => {
        const { zcfSeatAdmin, zcfSeat } = makeSeatAdmin(
          allSeatStagings,
          zoeSeatAdmin,
          seatData,
          getAmountMath,
        );
        seatToZCFSeatAdmin.init(zcfSeat, zcfSeatAdmin);
        const offerHandler = invitationHandleToHandler.get(invitationHandle);
        // @ts-ignore
        const offerResultP = E(offerHandler)(zcfSeat).catch(err => {
          zcfSeat.exit();
          throw err;
        });
        const exitObj = makeExitObj(seatData.proposal, zoeSeatAdmin);
        /** @type AddSeatResult */
        const addSeatResult = { offerResultP, exitObj };
        return harden(addSeatResult);
      },
    };
    harden(addSeatObj);

    // First, evaluate the contract code bundle.
    const contractCode = evalContractBundle(bundle);

    // Next, execute the contract code, passing in zcf and the terms
    /** @type {Promise<Invite>} */
    return E(contractCode)
      .start(zcf, instanceRecord.terms)
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
