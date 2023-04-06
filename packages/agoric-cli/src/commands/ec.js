/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global globalThis, process, setTimeout */
import { execFileSync as execFileSyncAmbient } from 'child_process';
import { Command, CommanderError } from 'commander';
import { makeAgd, withAgdOptions } from '../lib/chain.js';
import { makeTUI } from '../lib/format.js';
import { makeQueryClient } from '../lib/rpc.js';
import { findContinuingIds, makeAccountFactory } from '../lib/wallet.js';

/** @typedef {import('@agoric/smart-wallet/src/offers.js').OfferSpec} OfferSpec */

/**
 * @param {string} instanceName
 * @param {ReturnType<typeof findContinuingIds>} found
 */
const abortIfSeen = (instanceName, found) => {
  const done = found.filter(it => it.instanceName === instanceName);
  if (done.length > 0) {
    console.warn(`invitation to ${instanceName} already accepted`, done);
    throw new CommanderError(1, 'EALREADY', `already accepted`);
  }
};

/**
 *
 * @param {import('anylogger').Logger} logger
 * @param {{
 *   env?: Record<string, string|undefined>,
 *   fetch?: typeof window.fetch,
 *   stdout?: Pick<import('stream').Writable, 'write'>,
 *   stderr?: Pick<import('stream').Writable, 'write'>,
 *   execFileSync?: typeof execFileSyncAmbient,
 *   delay?: (ms: number) => Promise<void>,
 * }} [io]
 */
export const makeEconomicCommiteeCommand = (logger, io = {}) => {
  const {
    // Allow caller to provide access explicitly, but
    // default to conventional ambient IO facilities.
    env = process.env,
    stdout = process.stdout,
    fetch = globalThis.fetch,
    execFileSync = execFileSyncAmbient,
    delay = ms => new Promise(resolve => setTimeout(resolve, ms)),
  } = io;
  const tui = makeTUI({ stdout, logger });

  const ec = withAgdOptions(
    new Command('ec').description('Economic Committee commands'),
    { env },
  );

  const accountFactory = makeAccountFactory({
    tui,
    delay,
    agdLocal: makeAgd({ execFileSync }).withOpts(ec.opts()),
    qLocal: makeQueryClient({ fetch }),
  });

  ec.command('committee')
    .description('accept invitation to join the economic committee')
    .option('--voter [number]', 'Voter number', Number, 0)
    .option(
      '--offerId [string]',
      'Offer id',
      String,
      `ecCommittee-${Date.now()}`,
    )
    .requiredOption(
      '--from <name-or-address>',
      'Send from address',
      accountFactory.normalizeAddress,
    )
    .action(
      /**
       * @param {{
       *   voter: number,
       *   offerId: string,
       *   from: string,
       * }} opts
       */
      async function (opts) {
        const { agoricNames, account, current } =
          await accountFactory.makeAccountKit(opts.from, env.AGORIC_NET);

        const instance = agoricNames.instance.economicCommittee;
        assert(instance, `missing economicCommittee`);

        const found = findContinuingIds(current, agoricNames);
        abortIfSeen('economicCommittee', found);

        /** @type { OfferSpec } */
        const offer = {
          id: opts.offerId,
          invitationSpec: {
            source: 'purse',
            instance,
            description: `Voter${opts.voter}`,
          },
          proposal: {},
        };

        await account.processOffer(offer);
      },
    );

  ec.command('charter')
    .description('accept the charter invitation')
    .option('--offerId [string]', 'Offer id', String, `ecCharter-${Date.now()}`)
    .option(
      '--send-from <name-or-address>',
      'Send from address',
      accountFactory.normalizeAddress,
    )
    .action(async function (opts) {
      const { agoricNames, account, current } =
        await accountFactory.makeAccountKit(opts.sendFrom, env.AGORIC_NET);

      const instance = agoricNames.instance.econCommitteeCharter;
      assert(instance, `missing econCommitteeCharter`);

      const found = findContinuingIds(current, agoricNames);
      abortIfSeen('econCommitteeCharter', found);

      /** @type {OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'purse',
          instance,
          description: 'charter member invitation',
        },
        proposal: {},
      };

      await account.processOffer(offer);
    });

  ec.command('find-continuing-ids')
    .description('find ids of proposing, voting continuing invitations')
    .requiredOption(
      '--from <name-or-address>',
      'from address',
      accountFactory.normalizeAddress,
    )
    .action(
      /**
       * @param {{
       *   from: string,
       * }} opts
       */
      async opts => {
        const { agoricNames, current } = await accountFactory.makeAccountKit(
          opts.from,
          env.AGORIC_NET,
        );

        const found = findContinuingIds(current, agoricNames);
        found.forEach(it => tui.show({ ...it, address: opts.from }));
      },
    );

  ec.command('vote')
    .description('vote on a question (hard-coded for now))')
    .option('--offerId [number]', 'Offer id', String, `ecVote-${Date.now()}`)
    .requiredOption(
      '--forPosition [number]',
      'index of one position to vote for (within the question description.positions); ',
      Number,
    )
    // XXX BREAKING CHANGE. also: should be --from
    .requiredOption(
      '--send-from <name-or-address>',
      'Send from address',
      accountFactory.normalizeAddress,
    )
    .action(
      /**
       * @param {{
       *   offerId: string,
       *   forPosition: number,
       *   sendFrom: string,
       * }} opts
       */
      async function (opts) {
        const { board, agoricNames, account, current } =
          await accountFactory.makeAccountKit(opts.sendFrom, env.AGORIC_NET);

        const info = await board.readLatestHead(
          'published.committees.Economic_Committee.latestQuestion',
        );
        // XXX runtime shape-check
        const questionDesc = /** @type {any} */ (info);

        // TODO support multiple position arguments
        const chosenPositions = [questionDesc.positions[opts.forPosition]];
        assert(chosenPositions, `undefined position index ${opts.forPosition}`);

        const cont = findContinuingIds(current, agoricNames);
        const votingRight = cont.find(
          it => it.instance === agoricNames.instance.economicCommittee,
        );
        if (!votingRight) {
          throw new CommanderError(
            1,
            'NO_INVITATION',
            'first, try: agops ec committee ...',
          );
        }
        /** @type {OfferSpec} */
        const offer = {
          id: opts.offerId,
          invitationSpec: {
            source: 'continuing',
            previousOffer: votingRight.offerId,
            invitationMakerName: 'makeVoteInvitation',
            // (positionList, questionHandle)
            invitationArgs: harden([
              chosenPositions,
              questionDesc.questionHandle,
            ]),
          },
          proposal: {},
        };

        await account.processOffer(offer);
      },
    );

  return ec;
};
