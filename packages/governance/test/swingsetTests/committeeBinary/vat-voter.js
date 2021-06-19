// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { observeNotifier } from '@agoric/notifier';

const verify = async (log, question, registrarPublicFacet) => {
  const ballotTemplate = E(registrarPublicFacet).getBallot(question);
  const { positions, method, question: q, maxChoices, instance } = await E(
    ballotTemplate,
  ).getDetails();
  log(`Verify ballot from instance: ${question}, ${positions}, ${method}`);
  const c = await E(registrarPublicFacet).getName();
  log(`Verify: q: ${q}, max: ${maxChoices}, committee: ${c}`);
  const registrarInstance = await E(registrarPublicFacet).getInstance();
  log(`Verify: registrar: ${registrarInstance}, counter: ${instance}`);
};

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, invitation, choice) => {
      const registrarInstance = await E(zoe).getInstance(invitation);
      const registrarPublicFacet = E(zoe).getPublicFacet(registrarInstance);
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      const votingObserver = Far('voting observer', {
        updateState: async question => {
          const ballotTemplate = E(registrarPublicFacet).getBallot(question);
          const ballot = await E(ballotTemplate).choose([choice]);
          log(`${name} cast a ballot on ${question} for ${ballot.chosen}`);
          return E(voteFacet).castBallot(ballot);
        },
      });
      const notifier = E(registrarPublicFacet).getQuestionNotifier();
      observeNotifier(notifier, votingObserver);

      return Far(`Voter ${name}`, {
        verifyBallot: question => verify(log, question, registrarPublicFacet),
      });
    },
  });
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
