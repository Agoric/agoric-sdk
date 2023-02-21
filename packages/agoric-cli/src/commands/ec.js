/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch */
import { Command } from 'commander';
import { makeRpcUtils, storageHelper } from '../lib/rpc.js';
import { outputAction } from '../lib/wallet.js';

const { vstorage, fromBoard, agoricNames } = await makeRpcUtils({ fetch });

/**
 *
 * @param {import('anylogger').Logger} _logger
 */
export const makeEconomicCommiteeCommand = async _logger => {
  const ec = new Command('ec').description('Economic Committee commands');

  ec.command('committee')
    .description('accept invitation to join the economic committee')
    .option(
      '--offerId [string]',
      'Offer id',
      String,
      `ecCommittee-${Date.now()}`,
    )
    .action(async function (opts) {
      const { economicCommittee } = agoricNames.instance;
      assert(economicCommittee, 'missing economicCommittee');

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'purse',
          // @ts-expect-error xxx RpcRemote
          instance: economicCommittee,
          description: 'Voter0', // XXX it may not always be
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  ec.command('charter')
    .description('prepare an offer to accept the charter invitation')
    .option('--offerId [string]', 'Offer id', String, `ecCharter-${Date.now()}`)
    .action(async function (opts) {
      const { econCommitteeCharter } = agoricNames.instance;
      assert(econCommitteeCharter, 'missing econCommitteeCharter');

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'purse',
          // @ts-expect-error xxx RpcRemote
          instance: econCommitteeCharter,
          description: 'charter member invitation',
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  ec.command('vote')
    .description('vote on a question (hard-coded for now))')
    .option('--offerId [number]', 'Offer id', String, `ecVote-${Date.now()}`)
    .requiredOption(
      '--econCommAcceptOfferId [string]',
      'offer that had continuing invitation result',
    )
    .requiredOption(
      '--forPosition [number]',
      'index of one position to vote for (within the question description.positions); ',
      Number,
    )
    .action(async function (opts) {
      const questionHandleCapDataStr = await vstorage.readLatest(
        'published.committees.Economic_Committee.latestQuestion',
      );
      const questionDescriptions = storageHelper.unserializeTxt(
        questionHandleCapDataStr,
        fromBoard,
      );

      assert(questionDescriptions, 'missing questionDescriptions');
      assert(
        questionDescriptions.length === 1,
        'multiple questions not supported',
      );

      const questionDesc = questionDescriptions[0];
      // TODO support multiple position arguments
      const chosenPositions = [questionDesc.positions[opts.forPosition]];
      assert(chosenPositions, `undefined position index ${opts.forPosition}`);

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.econCommAcceptOfferId,
          invitationMakerName: 'makeVoteInvitation',
          // (positionList, questionHandle)
          invitationArgs: harden([
            chosenPositions,
            questionDesc.questionHandle,
          ]),
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  return ec;
};
