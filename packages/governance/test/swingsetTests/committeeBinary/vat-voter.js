// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { observeNotifier } from '@agoric/notifier';
import { q } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

const verify = async (log, question, registrarPublicFacet, instances) => {
  const handles = await E(registrarPublicFacet).getOpenQuestions();
  const detailsP = handles.map(h => {
    const ballot = E(registrarPublicFacet).getBallot(h);
    return E(ballot).getDetails();
  });
  const detailsPlural = await Promise.all(detailsP);
  const details = detailsPlural.find(d => sameStructure(d.question, question));

  const { positions, method, question: ques, maxChoices } = details;
  log(
    `Verify ballot from instance: ${q(question)}, ${q(positions)}, ${method}`,
  );
  const c = await E(registrarPublicFacet).getName();
  log(`Verify: q: ${q(ques)}, max: ${maxChoices}, committee: ${c}`);
  const registrarInstance = await E(registrarPublicFacet).getInstance();
  log(
    `Verify instances: registrar: ${registrarInstance ===
      instances.registrarInstance}, counter: ${details.counterInstance ===
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
        updateState: details => {
          log(`${name} cast a ballot for ${q(choice)}`);
          return E(voteFacet).castBallotFor(details.handle, [choice]);
        },
      });
      const notifier = E(registrarPublicFacet).getQuestionNotifier();
      observeNotifier(notifier, votingObserver);

      return Far(`Voter ${name}`, {
        verifyBallot: (question, instances) =>
          verify(log, question, registrarPublicFacet, instances),
      });
    },
    createMultiVoter: async (name, invitation, choices) => {
      const registrarInstance = await E(zoe).getInstance(invitation);
      const registrarPublicFacet = E(zoe).getPublicFacet(registrarInstance);
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      const voteMap = new Map();
      choices.forEach(entry => {
        const [question, position] = entry;
        voteMap.set(question.text, position);
      });
      const votingObserver = Far('voting observer', {
        updateState: details => {
          const choice = voteMap.get(details.question.text);
          log(
            `${name} cast a ballot on ${q(details.question)} for ${q(choice)}`,
          );
          return E(voteFacet).castBallotFor(details.handle, [choice]);
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

export const buildRootObject = vatPowers =>
  Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
