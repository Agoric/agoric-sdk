import { makePublishKit } from '@agoric/notifier';
import { makePromiseKit } from '@endo/promise-kit';
import { makeHeapFarInstance } from '@agoric/store';
import { EmptyProposal } from '@agoric/zoe/src/typeGuards.js';

import { ElectoratePublicI, ElectorateCreatorI } from './typeGuards.js';

/**
 * This Electorate visibly has no members, takes no votes, and approves no
 * changes.
 *
 *  @type {ContractStartFn<ElectoratePublic, ElectorateCreatorFacet>}
 */
const start = zcf => {
  const { subscriber } = makePublishKit();

  const publicFacet = makeHeapFarInstance('publicFacet', ElectoratePublicI, {
    getQuestionSubscriber() {
      return subscriber;
    },
    getOpenQuestions() {
      /** @type {Handle<'Question'>[]} */
      const noQuestions = [];
      const questionsPromise = makePromiseKit();
      questionsPromise.resolve(noQuestions);
      return questionsPromise.promise;
    },
    getName() {
      return 'no Action electorate';
    },
    getInstance() {
      return zcf.getInstance();
    },
    getQuestion(_instance, _question) {
      throw Error(`noActionElectorate doesn't have questions.`);
    },
  });

  const creatorFacet = makeHeapFarInstance('creatorFacet', ElectorateCreatorI, {
    getPoserInvitation() {
      return zcf.makeInvitation(
        () => {},
        `noActionElectorate doesn't allow posing questions`,
        undefined,
        EmptyProposal,
      );
    },
    addQuestion(_instance, _question) {
      throw Error(`noActionElectorate doesn't add questions.`);
    },
    getVoterInvitations() {
      throw Error(`No Action Electorate doesn't have invitations.`);
    },
    getQuestionSubscriber() {
      return subscriber;
    },
    getPublicFacet() {
      return publicFacet;
    },
  });

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
