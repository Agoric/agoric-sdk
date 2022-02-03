// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

import {
  assertContractElectorate,
  assertContractGovernance,
  validateQuestionFromCounter,
  validateQuestionDetails,
  assertBallotConcernsQuestion,
} from '../../../src/index.js';
import { MALLEABLE_NUMBER } from './governedContract.js';

const { details: X, quote: q } = assert;

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, invitation) => {
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      return Far(`Voter ${name}`, {
        castBallotFor: async (questionHandle, choice) => {
          log(`Voter ${name} voted for ${q(choice)}`);
          return E(voteFacet).castBallotFor(questionHandle, [choice]);
        },
        validate: async (
          counterInstance,
          governedInstance,
          electorateInstance,
          governorInstance,
          installations,
        ) => {
          const validateQuestionFromCounterP = validateQuestionFromCounter(
            zoe,
            electorateInstance,
            counterInstance,
          );

          const contractGovernanceP = assertContractGovernance(
            zoe,
            governedInstance,
            governorInstance,
            installations.contractGovernor,
          );

          const [
            questionDetails,
            electorateInstallation,
            voteCounterInstallation,
            governedInstallation,
            governorInstallation,
            validatedQuestion,
            contractGovernance,
          ] = await Promise.all([
            E(E(zoe).getPublicFacet(counterInstance)).getDetails(),
            E(zoe).getInstallationForInstance(electorateInstance),
            E(zoe).getInstallationForInstance(counterInstance),
            E(zoe).getInstallationForInstance(governedInstance),
            E(zoe).getInstallationForInstance(governorInstance),
            validateQuestionFromCounterP,
            contractGovernanceP,
          ]);

          assertBallotConcernsQuestion(MALLEABLE_NUMBER, questionDetails);
          assert(installations.binaryVoteCounter === voteCounterInstallation);
          assert(installations.governedContract === governedInstallation);
          assert(installations.contractGovernor === governorInstallation);
          assert(installations.committee === electorateInstallation);
          await assertContractElectorate(
            zoe,
            governorInstance,
            electorateInstance,
          );

          await validateQuestionDetails(
            zoe,
            electorateInstance,
            questionDetails,
          );
          assert(validatedQuestion, X`governor failed to validate electorate`);
          assert(
            contractGovernance,
            X`governor and governed aren't tightly linked`,
          );

          log(`Voter ${name} validated all the things`);
        },
      });
    },
  });
};

export const buildRootObject = vatPowers =>
  Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
