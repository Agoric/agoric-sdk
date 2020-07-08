/* global harden */
// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';
import { makeZoeHelpers } from '../../../src/contractSupport';

/**
 * Implement coin voting. Give a voting capability when a payment is
 * escrowed.
 *
 * @typedef {import('../../../src/zoe').ContractFacet} ContractFacet
 * @typedef {import('@agoric/ERTP').Amount} Amount
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { assertKeywords, checkHook } = makeZoeHelpers(zcf);
  assertKeywords(harden(['Assets']));
  const {
    brandKeywordRecord,
    terms: { question },
  } = zcf.getInstanceRecord();
  // We assume the only valid responses are 'YES' and 'NO'
  const amountMath = zcf.getAmountMath(brandKeywordRecord.Assets);

  const offerHandleToResponse = makeStore('offerHandle');

  // TODO: Validate that the response is of the format: { [question]: 'YES'|'NO'}
  const validateResponse = (_offerHandle, _response) => {
    // Complete the offer if the response is not valid and then throw.
  };

  const voterHook = voterOfferHandle => {
    const voter = harden({
      /**
       * Vote on a particular issue
       * @param {object} response: { [question]: answer }
       */
      vote: response => {
        // Throw if the offer is no longer active, i.e. the user has
        // completed their offer and the assets are no longer escrowed.
        assert(
          zcf.isOfferActive(voterOfferHandle),
          `the escrowing offer is no longer active`,
        );

        validateResponse(response);

        // Record the response
        if (offerHandleToResponse.has(voterOfferHandle)) {
          offerHandleToResponse.set(voterOfferHandle, response);
        } else {
          offerHandleToResponse.init(voterOfferHandle, response);
        }
        return `Successfully voted ${response}`;
      },
    });
    return voter;
  };

  const expectedVoterProposal = harden({
    give: { Assets: null },
  });

  const makeVoterInvite = () =>
    zcf.makeInvitation(checkHook(voterHook, expectedVoterProposal), 'voter');

  const expectedSecretaryProposal = harden({});

  const secretaryHook = secretaryOfferHandle => {
    const secretary = harden({
      // TODO: complete function
      closeElection: () => {
        // YES | NO to Nat
        const tally = new Map();
        // Iterate through offerHandleToResponse

        // Get the amount currently escrowed for each offerHandle
        // const escrowedAmount = zcf.getCurrentAllocation(offerHandle).Assets;

        // Add to the running tally weighting by the extent escrowed.
        // tally.set(response[question], escrowedAmount.extent)

        // Complete all the voting offers
        // zcf.complete(offerHandleToResponse.keys())

        // Complete the secretary offer?

        return harden(tally);
      },
      // TODO: prevent this from working if election is closed?
      makeVoterInvite,
    });
    return secretary;
  };

  // Return the secretary invite so that the entity that created the
  // contract instance can hand out scarce votes and close the election.
  return zcf.makeInvitation(
    checkHook(secretaryHook, expectedSecretaryProposal),
    'secretary',
  );
};

harden(makeContract);
export { makeContract };
