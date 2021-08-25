// @ts-check

import { q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import { assertContractRegistrar } from '../../../src/validators.js';
import { validateBallotFromCounter } from '../../../src/contractGovernor.js';
import { assertBallotConcernsQuestion } from '../../../src/governParam.js';

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
          installations,
        ) => {
          await validateBallotFromCounter(
            zoe,
            registrarInstance,
            counterInstance,
          );

          const [
            governedParam,
            ballotDetails,
            registrarInstallation,
            ballotCounterInstallation,
            governedInstallation,
            governorInstallation,
          ] = await Promise.all([
            E.get(E(zoe).getTerms(governedInstance)).governedParams,
            E(E(zoe).getPublicFacet(counterInstance)).getDetails(),
            E(zoe).getInstallationForInstance(registrarInstance),
            E(zoe).getInstallationForInstance(counterInstance),
            E(zoe).getInstallationForInstance(governedInstance),
            E(zoe).getInstallationForInstance(governorInstance),
          ]);

          const contractParam = governedParam.contractParams;
          assertBallotConcernsQuestion(contractParam[0], ballotDetails);
          assert(
            installations.binaryBallotCounter === ballotCounterInstallation,
          );
          assert(installations.governedContract === governedInstallation);
          assert(installations.contractGovernor === governorInstallation);
          assert(installations.committeeRegistrar === registrarInstallation);
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
