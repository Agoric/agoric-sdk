// @ts-check

import { assert, details, q } from '@agoric/assert';
import makeStore from '@agoric/store';
// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../../../src/contractSupport';

/**
 * This contract implements coin voting. There are two roles: the
 * Secretary, who can determine the question (a string), make voting
 * invites, and close the election; and the Voters, who can vote YES or
 * NO on the question. The voters can only get the capability to vote
 * by making an offer using a voter invite and escrowing assets. The
 * brand of assets is determined on contract instantiation through an
 * issuerKeywordRecord. The instantiator gets the only Secretary
 * invite.
 *
 * @typedef {import('../../../src/zoe').ContractFacet} ContractFacet
 * @typedef {import('@agoric/ERTP').Amount} Amount
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { assertKeywords, assertNatMathHelpers, checkHook } = makeZoeHelpers(
    zcf,
  );
  assertKeywords(harden(['Assets']));
  const {
    terms: { question },
    brandKeywordRecord: { Assets: assetsBrand },
  } = zcf.getInstanceRecord();
  assert.typeof(question, 'string');
  assertNatMathHelpers(assetsBrand);
  const amountMath = zcf.getAmountMath(assetsBrand);

  const offerHandleToResponse = makeStore('offerHandle');

  // We assume the only valid responses are 'YES' and 'NO'
  const assertResponse = response => {
    assert(
      response === 'NO' || response === 'YES',
      details`the answer ${q(response)} was not 'YES' or 'NO'`,
    );
    // Throw an error if the response is not valid, but do not
    // complete the offer. We should allow the voter to recast their vote.
  };

  const voterHook = voterOfferHandle => {
    const voter = harden({
      /**
       * Vote on a particular issue
       * @param {string} response - 'YES' || 'NO'
       */
      vote: response => {
        // Throw if the offer is no longer active, i.e. the user has
        // completed their offer and the assets are no longer escrowed.
        assert(
          zcf.isOfferActive(voterOfferHandle),
          details`the escrowing offer is no longer active`,
        );

        assertResponse(response);

        // Record the response
        if (offerHandleToResponse.has(voterOfferHandle)) {
          offerHandleToResponse.set(voterOfferHandle, response);
        } else {
          offerHandleToResponse.init(voterOfferHandle, response);
        }
        return `Successfully voted '${response}'`;
      },
    });
    return voter;
  };

  const expectedVoterProposal = harden({
    give: { Assets: null },
  });

  const expectedSecretaryProposal = harden({});

  const secretaryHook = secretaryOfferHandle => {
    // TODO: what if the secretary offer is no longer active?
    const secretary = harden({
      closeElection: () => {
        assert(
          zcf.isOfferActive(secretaryOfferHandle),
          'the election is already closed',
        );
        // YES | NO to Nat
        const tally = new Map();
        tally.set('YES', amountMath.getEmpty());
        tally.set('NO', amountMath.getEmpty());

        for (const [offerHandle, response] of offerHandleToResponse.entries()) {
          if (zcf.isOfferActive(offerHandle)) {
            const escrowedAmount = zcf.getCurrentAllocation(offerHandle).Assets;
            const sumSoFar = tally.get(response);
            tally.set(response, amountMath.add(escrowedAmount, sumSoFar));
            zcf.complete([offerHandle]);
          }
        }
        zcf.complete([secretaryOfferHandle]);

        return harden({
          YES: tally.get('YES'),
          NO: tally.get('NO'),
        });
      },
      makeVoterInvite: () => {
        assert(
          zcf.isOfferActive(secretaryOfferHandle),
          'the election is closed',
        );
        return zcf.makeInvitation(
          checkHook(voterHook, expectedVoterProposal),
          'voter',
        );
      },
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
