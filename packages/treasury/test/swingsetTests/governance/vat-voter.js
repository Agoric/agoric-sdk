// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, invitation) => {
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      return Far(`Voter ${name}`, {
        castBallotFor: async (handle, choice) => {
          log(`Voter ${name} cast a ballot for ${choice}`);
          return E(voteFacet).castBallotFor(handle, [choice]);
        },
        validate: async (
          counterInstance,
          governedInstance,
          registrarInstance,
          governorInstance,
          question,
        ) => {
          // I'd like to validate Installations, but there doesn't seem to be a
          // way to get it from an Instance. I'd verify the Registrar,
          // ballotCounter, and contractGovernor.

          const governedTermsP = E(zoe).getTerms(governedInstance);
          const electionManagerP = E.get(governedTermsP).electionManager;
          const governorPublicP = E(zoe).getPublicFacet(await electionManagerP);
          const registrarPublicFromGovernorP = E(
            governorPublicP,
          ).getRegistrar();
          const registrarIFromGovernorP = E(
            registrarPublicFromGovernorP,
          ).getInstance();

          const counterPublicP = E(zoe).getPublicFacet(counterInstance);
          const ballotSpecP = E.get(E(counterPublicP).getDetails()).ballotSpec;

          const [
            electionManager,
            registrarIFromGovernor,
            ballotSpec,
          ] = await Promise.all([
            electionManagerP,
            registrarIFromGovernorP,
            ballotSpecP,
          ]);

          const governorMatches = electionManager === governorInstance;
          log(
            `governor from governed ${
              governorMatches ? 'matches' : 'does not match'
            } governor instance`,
          );

          const included = ballotSpec.question.param === question.param;
          log(
            `Param "${question.param}" ${
              included ? 'is' : 'is not'
            } in the question`,
          );

          const registrarsMatch = registrarIFromGovernor === registrarInstance;
          log(
            `registrar from governor ${
              registrarsMatch ? 'matches' : 'does not match'
            }`,
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
