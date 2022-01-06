// @ts-check
import { Far } from '@agoric/marshal';
import { AssetKind, AmountMath } from '@agoric/ertp';
import { makeStore } from '@agoric/store';

import '../../../../src/contracts/attestation/types.js';

const { details: X } = assert;

// This voting contract does not track addresses, and does not care if
// one address has multiple seats with different votes. Seems like
// trying to enforce one address/one vote would create an incentive
// for users to create multiple accounts, which we don't want.

/** @type {ContractStartFn} */
const start = zcf => {
  const {
    brands: { Attestation: attestationBrand },
  } = zcf.getTerms();

  /** @type {Store<Handle<'Attestation'>, { seat: ZCFSeat,
   * expiration: Timestamp, amountLiened: Amount}>} */
  const storedAttestations = makeStore();

  /** @type {Store<ZCFSeat, string>} */
  const recordedVotes = makeStore();

  const empty = AmountMath.makeEmpty(attestationBrand, AssetKind.SET);

  /** @type {OfferHandler} */
  const vote = seat => {
    const attestation = seat.getAmountAllocated('Attestation');
    assert(
      AmountMath.isGTE(attestation, empty, attestationBrand),
      X`There was no attestation escrowed`,
    );
    const attestationValue = /** @type {SetValue} */ (attestation.value);

    attestationValue.forEach(
      /** @param {ExpiringAttElem} attestationElem */ attestationElem => {
        const { amountLiened, handle, expiration } = attestationElem;
        if (storedAttestations.has(handle)) {
          // We check the newly escrowed attestation against the one we
          // have already stored. If the newly escrowed one has an
          // earlier or equal expiration, it is old and we should keep
          // the priorAttestation instead.
          const priorAttestation = storedAttestations.get(handle);
          if (expiration > priorAttestation.expiration) {
            storedAttestations.set(
              handle,
              harden({ seat, expiration, amountLiened }),
            );
          }
        } else {
          storedAttestations.init(
            handle,
            harden({ seat, expiration, amountLiened }),
          );
        }
      },
    );

    // Give the user their attestation payment back
    seat.exit();

    return Far('offerResult', {
      /** @param {string} answer */
      castVote: answer => {
        if (recordedVotes.has(seat)) {
          recordedVotes.set(seat, answer);
        } else {
          recordedVotes.init(seat, answer);
        }
      },
    });
  };

  const publicFacet = Far('publicFacet', {
    makeVoteInvitation: () => zcf.makeInvitation(vote, 'vote'),
  });

  const creatorFacet = Far('creatorFacet', {
    closeVote: currentTime => {
      // For each seat, sum the values in the attestations as long as
      // the expiration is after the currentTime.

      /** @type {Store<ZCFSeat, Amount>} */
      const sumBySeat = makeStore();

      for (const {
        seat,
        expiration,
        amountLiened,
      } of storedAttestations.values()) {
        // Only add the weight if the expiration is later than the
        // currentTime.
        if (expiration > currentTime) {
          const weight = amountLiened;
          if (sumBySeat.has(seat)) {
            const weightSoFar = sumBySeat.get(seat);
            sumBySeat.set(seat, AmountMath.add(weightSoFar, weight));
          } else {
            sumBySeat.init(seat, weight);
          }
        }
      }

      /** @type {Store<string, Amount>} */
      const weightedAnswers = makeStore('answers');

      for (const [seat, answer] of recordedVotes.entries()) {
        // The seat may no longer have a weight if an extended
        // expiration attestation was used that replaced a previous
        // attestation
        if (sumBySeat.has(seat)) {
          const weight = sumBySeat.get(seat);
          if (weightedAnswers.has(answer)) {
            const weightSoFar = weightedAnswers.get(answer);
            weightedAnswers.set(answer, AmountMath.add(weightSoFar, weight));
          } else {
            weightedAnswers.init(answer, weight);
          }
        }
      }

      return [...weightedAnswers.entries()].map(([answer, amount]) => [
        answer,
        amount.value,
      ]);
    },
  });

  return harden({
    publicFacet,
    creatorFacet,
  });
};
harden(start);
export { start };
