// @ts-check

import { makePublishKit } from '@agoric/notifier';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

/**
 * This Electorate visibly has no members, takes no votes, and approves no
 * changes.
 *
 *  @type {ContractStartFn<ElectoratePublic, ElectorateCreatorFacet>}
 */
const start = zcf => {
  const { subscriber } = makePublishKit();

  const publicFacet = Far('publicFacet', {
    getQuestionSubscriber: () => subscriber,
    getOpenQuestions: () => {
      /** @type {Handle<'Question'>[]} */
      const noQuestions = [];
      const questionsPromise = makePromiseKit();
      questionsPromise.resolve(noQuestions);
      return questionsPromise.promise;
    },
    getName: () => 'no Action electorate',
    getInstance: zcf.getInstance,
    getQuestion: () => {
      throw Error(`noActionElectorate doesn't have questions.`);
    },
  });

  const creatorFacet = Far('creatorFacet', {
    getPoserInvitation: () => {
      return zcf.makeInvitation(() => {},
      `noActionElectorate doesn't allow posing questions`);
    },
    addQuestion() {
      throw Error(`noActionElectorate doesn't add questions.`);
    },
    getVoterInvitations: () => {
      throw Error(`No Action Electorate doesn't have invitations.`);
    },
    getQuestionSubscriber: () => subscriber,
    getPublicFacet: () => publicFacet,
  });

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
