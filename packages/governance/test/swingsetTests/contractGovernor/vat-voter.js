// @ts-check

import { q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import { assertContractRegistrar } from '../../../src/validators';
import { validateBallotFromCounter } from '../../../src/contractGovernor';
import { assertBallotConcernsQuestion } from '../../../src/governParam';

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
          registrarInstance,
          governorInstance,
        ) => {
          // I'd like to validate Installations, but there doesn't seem to be a
          // way to get it from an Instance. I'd verify the Registrar,
          // ballotCounter, and contractGovernor.

          await validateBallotFromCounter(
            zoe,
            registrarInstance,
            counterInstance,
          );

          const governedTermsP = E(zoe).getTerms(governedInstance);
          const governedParamP = E.get(governedTermsP).governedParams;
          const counterPublicP = E(zoe).getPublicFacet(counterInstance);
          const ballotDetailsP = E(counterPublicP).getDetails();

          const [governedParam, ballotDetails] = await Promise.all([
            governedParamP,
            ballotDetailsP,
          ]);

          const contractParam = governedParam.contractParams;
          assertBallotConcernsQuestion(contractParam[0], ballotDetails);
          await assertContractRegistrar(
            zoe,
            governorInstance,
            registrarInstance,
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
