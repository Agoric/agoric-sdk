// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { observeNotifier } from '@agoric/notifier';

const verify = async (log, question, registrarPublicFacet, instances) => {
  const ballotTemplate = E(registrarPublicFacet).getBallot(question);
  const { positions, method, question: q, maxChoices, instance } = await E(
    ballotTemplate,
  ).getDetails();
  log(`Verify ballot from instance: ${question}, ${positions}, ${method}`);
  const c = await E(registrarPublicFacet).getName();
  log(`Verify: q: ${q}, max: ${maxChoices}, committee: ${c}`);
  const registrarInstance = await E(registrarPublicFacet).getInstance();
  log(
    `Verify instances: registrar: ${registrarInstance ===
      instances.registrarInstance}, counter: ${instance ===
      instances.ballotInstance}`,
  );
};

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, invitation, choice) => {
      const registrarInstance = await E(zoe).getInstance(invitation);
      const registrarPublicFacet = E(zoe).getPublicFacet(registrarInstance);
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      const votingObserver = Far('voting observer', {
        updateState: question => {
          log(`${name} cast a ballot on ${question} for ${choice}`);
          return E(voteFacet).castBallotFor(question, [choice]);
        },
      });
      const notifier = E(registrarPublicFacet).getQuestionNotifier();
      observeNotifier(notifier, votingObserver);

      return Far(`Voter ${name}`, {
        verifyBallot: (question, instances) =>
          verify(log, question, registrarPublicFacet, instances),
      });
    },
  });
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
