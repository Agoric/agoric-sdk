import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  validateQuestionFromCounter,
  assertContractElectorate,
  assertBallotConcernsParam,
} from '@agoric/governance';

const { Fail, quote: q } = assert;

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
        /**
         *
         * @param {Instance} counterInstance
         * @param {Instance} governedInstance
         * @param {Instance} electorateInstance
         * @param {Instance} governorInstance
         * @param {{ parameterName: string, paramPath: unknown}} paramSpec
         * @param {Record<string, Installation>} installations
         * @returns {Promise<void>}
         */
        validate: async (
          counterInstance,
          governedInstance,
          electorateInstance,
          governorInstance,
          paramSpec,
          installations,
        ) => {
          const governedTermsP = E(zoe).getTerms(governedInstance);
          const electionManagerP = E.get(governedTermsP).electionManager;

          const counterPublicP = E(zoe).getPublicFacet(counterInstance);
          /** @type {Promise<QuestionSpec<ParamChangeIssue>>} */
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

          assertBallotConcernsParam(paramSpec, ballotDetails);

          await assertContractElectorate(
            zoe,
            governorInstance,
            electorateInstance,
          );

          const [
            counterInstallation,
            governorInstallation,
            electorateInstallation,
            governedInstallation,
          ] = await Promise.all([
            E(zoe).getInstallationForInstance(counterInstance),
            E(zoe).getInstallationForInstance(governorInstance),
            E(zoe).getInstallationForInstance(electorateInstance),
            E(zoe).getInstallationForInstance(governedInstance),
          ]);
          counterInstallation === installations.counter ||
            Fail`counterInstallation should match`;
          governorInstallation === installations.governor ||
            Fail`governor Installation should match`;
          electorateInstallation === installations.electorate ||
            Fail`electorate Installation should match`;
          governedInstallation === installations.vaultFactory ||
            Fail`vaultFactory Installation should match`;
        },
      });
    },
  });
};

/**
 * @typedef {ReturnType<Awaited<ReturnType<typeof build>>['createVoter']>} EVatVoter
 */

/** @type {BuildRootObjectForTestVat} */
export const buildRootObject = vatPowers =>
  Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
