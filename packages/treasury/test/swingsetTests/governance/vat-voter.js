// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { q } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { validateQuestionFromCounter } from '@agoric/governance/src/contractGovernor';
import { assertContractElectorate } from '@agoric/governance/src/validators';
import { assertBallotConcernsQuestion } from '@agoric/governance/src/governParam';

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, invitation) => {
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      return Far(`Voter ${name}`, {
        castBallotFor: async (handle, choice) => {
          log(`Voter ${name} cast a ballot for ${q(choice)}`);
          return E(voteFacet).castBallotFor(handle, [choice]);
        },
        validate: async (
          counterInstance,
          governedInstance,
          electorateInstance,
          governorInstance,
          issue,
        ) => {
          // I'd like to validate Installations, but there doesn't seem to be a
          // way to get it from an Instance. I'd verify the Electorate,
          // ballotCounter, and contractGovernor.
          const governedTermsP = E(zoe).getTerms(governedInstance);
          const electionManagerP = E.get(governedTermsP).electionManager;

          const counterPublicP = E(zoe).getPublicFacet(counterInstance);
          const ballotDetailsP = E(counterPublicP).getDetails();

          const [electionManager, ballotDetails] = await Promise.all([
            electionManagerP,
            ballotDetailsP,
          ]);

          await validateQuestionFromCounter(
            zoe,
            electorateInstance,
            counterInstance,
          );

          const governorMatches = electionManager === governorInstance;
          log(
            `governor from governed ${
              governorMatches ? 'matches' : 'does not match'
            } governor instance`,
          );

          const included = sameStructure(
            ballotDetails.issue.paramSpec,
            issue.paramSpec,
          );
          log(
            `Param "${issue.paramSpec.parameterName}" ${
              included ? 'is' : 'is not'
            } in the question`,
          );

          assertBallotConcernsQuestion(
            issue.paramSpec.parameterName,
            ballotDetails,
          );

          await assertContractElectorate(
            zoe,
            governorInstance,
            electorateInstance,
          );
        },
      });
    },
  });
};

export const buildRootObject = vatPowers =>
  Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
