// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { observeNotifier } from '@agoric/notifier';

const verify = async (log, question, registrarPublicFacet, instances) => {
  const handles = await E(registrarPublicFacet).getOpenQuestions();
  const detailsP = handles.map(h => {
    const ballot = E(registrarPublicFacet).getBallot(h);
    return E(ballot).getDetails();
  });
  const detailsPlural = await Promise.all(detailsP);
  const details = detailsPlural.find(d => d.ballotSpec.question === question);
  const { ballotSpec, instance } = details;
  const { positions, method, question: ques, maxChoices } = ballotSpec;
  log(`Verify ballot from instance: ${question}, ${positions}, ${method}`);
  const c = await E(registrarPublicFacet).getName();
  log(`Verify: q: ${ques}, max: ${maxChoices}, committee: ${c}`);
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
        updateState: details => {
          log(`${name} cast a ballot for ${choice}`);
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

      const voteMap = new Map(choices);
      const votingObserver = Far('voting observer', {
        updateState: details => {
          const choice = voteMap.get(details.ballotSpec.question);

          log(
            `${name} cast a ballot on ${details.ballotSpec.question} for ${choice}`,
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
