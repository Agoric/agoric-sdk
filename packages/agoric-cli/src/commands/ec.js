// @ts-check
/* eslint-disable func-names */
/* global globalThis, process, setTimeout */
import { execFileSync as execFileSyncAmbient } from 'child_process';
import { Command, CommanderError } from 'commander';
import { normalizeAddressWithOptions, pollBlocks } from '../lib/chain.js';
import { getNetworkConfig, makeRpcUtils } from '../lib/rpc.js';
import {
  findContinuingIds,
  getCurrent,
  getLastUpdate,
  outputActionAndHint,
  sendAction,
} from '../lib/wallet.js';

/** @typedef {import('@agoric/smart-wallet/src/offers.js').OfferSpec} OfferSpec */

/**
 * @param {import('anylogger').Logger} _logger
 * @param {{
 *   env?: Record<string, string|undefined>,
 *   fetch?: typeof window.fetch,
 *   stdout?: Pick<import('stream').Writable, 'write'>,
 *   stderr?: Pick<import('stream').Writable, 'write'>,
 *   execFileSync?: typeof execFileSyncAmbient,
 *   delay?: (ms: number) => Promise<void>,
 * }} [io]
 */
export const makeEconomicCommiteeCommand = (_logger, io = {}) => {
  const {
    // Allow caller to provide access explicitly, but
    // default to conventional ambient IO facilities.
    env = process.env,
    stdout = process.stdout,
    stderr = process.stderr,
    fetch = globalThis.fetch,
    execFileSync = execFileSyncAmbient,
    delay = ms => new Promise(resolve => setTimeout(resolve, ms)),
  } = io;

  const ec = new Command('ec').description('Economic Committee commands');

  /** @param {string} literalOrName */
  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, { keyringBackend: 'test' });

  /** @type {(info: unknown, indent?: unknown) => boolean } */
  const show = (info, indent) =>
    stdout.write(`${JSON.stringify(info, null, indent ? 2 : undefined)}\n`);

  const abortIfSeen = (instanceName, found) => {
    const done = found.filter(it => it.instanceName === instanceName);
    if (done.length > 0) {
      console.warn(`invitation to ${instanceName} already accepted`, done);
      throw new CommanderError(1, 'EALREADY', `already accepted`);
    }
  };

  /**
   * Make an offer from agoricNames, wallet status; sign and broadcast it,
   * given a sendFrom address; else print it.
   *
   * @param {{
   *   toOffer: (agoricNames: *, current: import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord | undefined) => OfferSpec,
   *   sendFrom?: string | undefined,
   *   instanceName?: string,
   * }} detail
   * @param {Awaited<ReturnType<makeRpcUtils>>} [optUtils]
   */
  const processOffer = async function ({ toOffer, sendFrom }, optUtils) {
    const networkConfig = await getNetworkConfig(env);
    const utils = await (optUtils || makeRpcUtils({ fetch }));
    const { agoricNames, readLatestHead } = utils;

    let current;
    if (sendFrom) {
      current = await getCurrent(sendFrom, { readLatestHead });
    }

    const offer = toOffer(agoricNames, current);
    if (!sendFrom) {
      outputActionAndHint(
        { method: 'executeOffer', offer },
        { stdout, stderr },
      );
      return;
    }

    const result = await sendAction(
      { method: 'executeOffer', offer },
      {
        keyring: { backend: 'test' }, // XXX
        from: sendFrom,
        verbose: false,
        ...networkConfig,
        execFileSync,
        stdout,
        delay,
      },
    );
    assert(result); // not dry-run
    const { timestamp, txhash, height } = result;
    console.error('wallet action is broadcast:');
    show({ timestamp, height, offerId: offer.id, txhash });
    const checkInWallet = async blockInfo => {
      const [state, update] = await Promise.all([
        getCurrent(sendFrom, { readLatestHead }),
        getLastUpdate(sendFrom, { readLatestHead }),
        readLatestHead(`published.wallet.${sendFrom}`),
      ]);
      if (update.updated === 'offerStatus' && update.status.id === offer.id) {
        return blockInfo;
      }
      const info = await findContinuingIds(state, agoricNames);
      const done = info.filter(it => it.offerId === offer.id);
      if (!(done.length > 0)) throw Error('retry');
      return blockInfo;
    };
    const blockInfo = await pollBlocks({
      retryMessage: 'offer not yet in block',
      ...networkConfig,
      execFileSync,
      delay,
    })(checkInWallet);
    console.error('offer accepted in block');
    show(blockInfo);
  };

  ec.command('committee')
    .description('accept invitation to join the economic committee')
    .option('--voter <number>', 'Voter number', Number, 0)
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `ecCommittee-${Date.now()}`,
    )
    .option(
      '--send-from <name-or-address>',
      'Send from address',
      normalizeAddress,
    )
    .action(async function (opts) {
      /** @type {Parameters<typeof processOffer>[0]['toOffer']} */
      const toOffer = (agoricNames, current) => {
        const instance = agoricNames.instance.economicCommittee;
        assert(instance, `missing economicCommittee`);

        if (current) {
          const found = findContinuingIds(current, agoricNames);
          abortIfSeen('economicCommittee', found);
        }

        return {
          id: opts.offerId,
          invitationSpec: {
            source: 'purse',
            instance,
            description: `Voter${opts.voter}`,
          },
          proposal: {},
        };
      };

      await processOffer({
        toOffer,
        instanceName: 'economicCommittee',
        ...opts,
      });
    });

  ec.command('charter')
    .description('accept the charter invitation')
    .option('--offerId <string>', 'Offer id', String, `ecCharter-${Date.now()}`)
    .option(
      '--send-from <name-or-address>',
      'Send from address',
      normalizeAddress,
    )
    .action(async function (opts) {
      /** @type {Parameters<typeof processOffer>[0]['toOffer']} */
      const toOffer = (agoricNames, current) => {
        const instance = agoricNames.instance.econCommitteeCharter;
        assert(instance, `missing econCommitteeCharter`);

        if (current) {
          const found = findContinuingIds(current, agoricNames);
          abortIfSeen('econCommitteeCharter', found);
        }

        return {
          id: opts.offerId,
          invitationSpec: {
            source: 'purse',
            instance,
            description: 'charter member invitation',
          },
          proposal: {},
        };
      };

      await processOffer({
        toOffer,
        instanceName: 'econCommitteeCharter',
        ...opts,
      });
    });

  ec.command('find-continuing-id')
    .description('print id of specified voting continuing invitation')
    .requiredOption(
      '--from <name-or-address>',
      'from address',
      normalizeAddress,
    )
    .requiredOption('--for <string>', 'description of the invitation')
    .action(async opts => {
      const { agoricNames, readLatestHead } = await makeRpcUtils({ fetch });
      const current = await getCurrent(opts.from, { readLatestHead });

      const known = findContinuingIds(current, agoricNames);
      if (!known) {
        console.error('No continuing ids found');
        return;
      }
      const match = known.find(r => r.description === opts.for);
      if (!match) {
        console.error(`No match found for '${opts.for}'`);
        return;
      }

      console.log(match.offerId);
    });

  ec.command('find-continuing-ids')
    .description('print records of voting continuing invitations')
    .requiredOption(
      '--from <name-or-address>',
      'from address',
      normalizeAddress,
    )
    .action(async opts => {
      const { agoricNames, readLatestHead } = await makeRpcUtils({ fetch });
      const current = await getCurrent(opts.from, { readLatestHead });

      const found = findContinuingIds(current, agoricNames);
      found.forEach(it => show({ ...it, address: opts.from }));
    });

  ec.command('vote')
    .description('vote on a question (hard-coded for now))')
    .option('--offerId <number>', 'Offer id', String, `ecVote-${Date.now()}`)
    .requiredOption(
      '--forPosition <number>',
      'index of one position to vote for (within the question description.positions); ',
      Number,
    )
    .requiredOption(
      '--send-from <name-or-address>',
      'Send from address',
      normalizeAddress,
    )
    .action(async function (opts) {
      const utils = await makeRpcUtils({ fetch });
      const { readLatestHead } = utils;

      const info = await readLatestHead(
        'published.committees.Economic_Committee.latestQuestion',
      ).catch(err => {
        throw new CommanderError(1, 'VSTORAGE_FAILURE', err.message);
      });
      // XXX runtime shape-check
      const questionDesc = /** @type {any} */ (info);

      // TODO support multiple position arguments
      const chosenPositions = [questionDesc.positions[opts.forPosition]];
      assert(chosenPositions, `undefined position index ${opts.forPosition}`);

      /** @type {Parameters<typeof processOffer>[0]['toOffer']} */
      const toOffer = (agoricNames, current) => {
        const cont = current ? findContinuingIds(current, agoricNames) : [];
        const votingRight = cont.find(
          it => it.instance === agoricNames.instance.economicCommittee,
        );
        if (!votingRight) {
          console.debug('continuing ids', cont, 'for', current);
          throw new CommanderError(
            1,
            'NO_INVITATION',
            'first, try: agops ec committee ...',
          );
        }
        return {
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
      };

      await processOffer({ toOffer, sendFrom: opts.sendFrom }, utils);
    });

  return ec;
};
