// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, invitation) => {
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      return Far(`Voter ${name}`, {
        castBallotFor: async (qName, choice) => {
          log(`Voter ${name} cast a ballot for ${choice}`);
          return E(voteFacet).castBallotFor(qName, [choice]);
        },
        validate: async (
          counterInstance,
          governedInstance,
          registrarInstance,
          governorInstance,
        ) => {
          // I'd like to validate Installations, but there doesn't seem to be a
          // way to get it from an Instance. I'd verify the Registrar,
          // ballotCounter, and contractGovernor.

          const governedTermsP = E(zoe).getTerms(governedInstance);
          const electionManagerP = E.get(governedTermsP).electionManager;
          const governedParamP = E.get(governedTermsP).governedParams;
          const governorPublicP = E(zoe).getPublicFacet(await electionManagerP);
          const registrarIFromGovernorP = E(governorPublicP).getRegistrar();

          const governsContractP = E(governorPublicP).governsContract(
            governedInstance,
          );
          const counterPublicP = E(zoe).getPublicFacet(counterInstance);
          const ballotTemplateP = E(counterPublicP).getBallotTemplate();
          const ballotDetails = E(ballotTemplateP).getDetails();
          const ballotSpecP = E.get(ballotDetails).ballotSpec;

          const [
            electionManager,
            registrarIFromGovernor,
            governedParam,
            ballotSpec,
            governsContract,
          ] = await Promise.all([
            electionManagerP,
            registrarIFromGovernorP,
            governedParamP,
            ballotSpecP,
            governsContractP,
          ]);
          const governorMatches = electionManager === governorInstance;
          const registrarsMatch = registrarIFromGovernor === registrarInstance;
          const contractParam = governedParam.contractParams;
          const included = ballotSpec.question.includes(contractParam);

          log(
            `governor from governed ${
              governorMatches ? 'matches' : 'does not match'
            } governor instance`,
          );
          log(
            `The governor claims ${
              governsContract ? 'to ' : 'not to '
            } govern the contract`,
          );
          log(
            `"${contractParam}" ${included ? 'is' : 'is not'} in the question`,
          );
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
