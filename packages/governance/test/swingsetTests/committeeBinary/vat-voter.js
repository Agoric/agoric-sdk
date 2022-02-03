// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { observeIteration } from '@agoric/notifier';
import { keyEQ } from '@agoric/store';

const { quote: q } = assert;

const verify = async (log, issue, electoratePublicFacet, instances) => {
  const questionHandles = await E(electoratePublicFacet).getOpenQuestions();
  const detailsP = questionHandles.map(h => {
    const question = E(electoratePublicFacet).getQuestion(h);
    return E(question).getDetails();
  });
  const detailsPlural = await Promise.all(detailsP);
  const details = detailsPlural.find(d => keyEQ(d.issue, issue));

  const { positions, method, issue: iss, maxChoices } = details;
  log(`verify question from instance: ${q(issue)}, ${q(positions)}, ${method}`);
  const c = await E(electoratePublicFacet).getName();
  log(`Verify: q: ${q(iss)}, max: ${maxChoices}, committee: ${c}`);
  const electorateInstance = await E(electoratePublicFacet).getInstance();
  log(
    `Verify instances: electorate: ${electorateInstance ===
      instances.electorateInstance}, counter: ${details.counterInstance ===
      instances.counterInstance}`,
  );
};

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, invitation, choice) => {
      const electorateInstance = await E(zoe).getInstance(invitation);
      const electoratePublicFacet = E(zoe).getPublicFacet(electorateInstance);
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      const votingObserver = Far('voting observer', {
        updateState: details => {
          log(`${name} voted for ${q(choice)}`);
          return E(voteFacet).castBallotFor(details.questionHandle, [choice]);
        },
      });
      const subscription = E(electoratePublicFacet).getQuestionSubscription();
      observeIteration(subscription, votingObserver);

      return Far(`Voter ${name}`, {
        verifyBallot: (question, instances) =>
          verify(log, question, electoratePublicFacet, instances),
      });
    },
    createMultiVoter: async (name, invitation, choices) => {
      const electorateInstance = await E(zoe).getInstance(invitation);
      const electoratePublicFacet = E(zoe).getPublicFacet(electorateInstance);
      const seat = E(zoe).offer(invitation);
      const voteFacet = E(seat).getOfferResult();

      const voteMap = new Map();
      choices.forEach(entry => {
        const [issue, position] = entry;
        voteMap.set(issue.text, position);
      });
      const votingObserver = Far('voting observer', {
        updateState: details => {
          const choice = voteMap.get(details.issue.text);
          log(`${name} voted on ${q(details.issue)} for ${q(choice)}`);
          return E(voteFacet).castBallotFor(details.questionHandle, [choice]);
        },
      });
      const subscription = E(electoratePublicFacet).getQuestionSubscription();
      observeIteration(subscription, votingObserver);

      return Far(`Voter ${name}`, {
        verifyBallot: (question, instances) =>
          verify(log, question, electoratePublicFacet, instances),
      });
    },
  });
};

export const buildRootObject = vatPowers =>
  Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
