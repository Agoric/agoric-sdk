/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import { Command } from 'commander';
import { asPercent } from '../lib/format.js';
import { makePSMSpendAction } from '../lib/psm.js';
import {
  makeRpcUtils,
  boardSlottingMarshaller,
  storageHelper,
} from '../lib/rpc.js';

// Adapted from https://gist.github.com/dckc/8b5b2f16395cb4d7f2ff340e0bc6b610#file-psm-tool

/**
 * Integration testing.
 * These are against a live network so don't run in CI.
 *
 * AGORIC_NET=ollinet bin/agops psm swap --wantMinted 6 --feePct 0.01 --offerId 123  | jq '.body |fromjson | .offer.id' # should be 123
 */

/**
 * @template K, V
 * @typedef {[key: K, val: V]} Entry<K,V>
 */

const last = xs => xs[xs.length - 1];

const { vstorage, fromBoard, agoricNames } = await makeRpcUtils({ fetch });

/**
 *
 * @param {[Minted: string, Anchor: string]} pair
 */
const getGovernanceState = async ([Minted, Anchor]) => {
  const govContent = await vstorage.read(
    `published.psm.${Minted}.${Anchor}.governance`,
  );
  assert(govContent, 'no gov content');
  const { current: governance } = last(
    storageHelper.unserialize(govContent, fromBoard),
  );
  const { [`psm.${Minted}.${Anchor}`]: instance } = agoricNames.instance;

  return { instance, governance };
};

/**
 *
 * @param {import('anylogger').Logger} logger
 */
export const makePsmCommand = async logger => {
  const psm = new Command('psm').description('PSM commands').usage(
    `
  WALLET=my-wallet
  export AGORIC_NET=ollinet
  
  # provision wallet if necessary
  agd keys add $WALLET
  # provision with faucet, e.g.
  open https://ollinet.faucet.agoric.net/ # and paste the key and choose client: smart-wallet

  # confirm funds
  agoric wallet list
  agoric wallet show —from $WALLET

  # prepare an offer to send
  # (offerId is optional but best to specify as each must be higher than the last and the default value is a huge number)
  agops psm swap --wantMinted 6 --feePct 0.01 --offerId 12 > offer-12.json
  
  # watch for results in one terminal
  agoric wallet watch --from $WALLET

  # sign and send in another
  agoric wallet send --from $WALLET --offer offer-12.json
  # that spits out a CLI command to run
  `,
  );

  const marshaller = boardSlottingMarshaller();

  const lookupInstance = ([minted, anchor]) => {
    const name = `psm-${minted}-${anchor}`;
    const instance = agoricNames.instance[name];
    if (!instance) {
      logger.debug('known instances:', agoricNames.instance);
      throw new Error(`Unknown instance ${name}`);
    }
    return instance;
  };

  /** @param {import('../lib/psm.js').BridgeAction} bridgeAction */
  const outputAction = bridgeAction => {
    const capData = marshaller.serialize(bridgeAction);
    process.stdout.write(JSON.stringify(capData));
  };

  psm
    .command('list')
    .description('list all PSMs in network')
    .action(async function () {
      const mints = await vstorage.keys('published.psm');
      for (const minted of mints) {
        const anchors = await vstorage.keys(`published.psm.${minted}`);
        for (const anchor of anchors) {
          process.stdout.write(`${minted}.${anchor}\n`);
        }
      }
    });

  psm
    .command('info')
    .description('show governance info about the PSM (BROKEN)')
    .requiredOption(
      '--pair [Minted.Anchor]',
      'token pair (Minted.Anchor)',
      s => s.split('.'),
      ['IST', 'AUSD'],
    )
    .action(async function () {
      const { pair } = this.opts();
      const { governance } = await getGovernanceState(pair);
      console.log('psm governance params', Object.keys(governance));
      console.log('MintLimit', governance.MintLimit.value);
      console.log(
        'WantMintedFee',
        asPercent(governance.WantMintedFee.value),
        '%',
      );
      console.log(
        'GiveMintedFee',
        asPercent(governance.GiveMintedFee.value),
        '%',
      );
    });

  psm
    .command('swap')
    .description('prepare an offer to swap')
    // TODO DRY
    .option(
      '--pair [Minted.Anchor]',
      'token pair (Minted.Anchor)',
      s => s.split('.'),
      ['IST', 'AUSD'],
    )
    // wantMinted and giveMinted options conflict.
    // TODO use .conflicts() after https://github.com/Agoric/agoric-sdk/issues/6181
    .option('--wantMinted [DOLLARS]', 'amount of anchor tokens to give', Number)
    .option('--giveMinted [DOLLARS]', 'amount of minted tokens to give', Number)
    .option('--feePct [%]', 'Gas fee percentage', Number)
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .action(async function () {
      const opts = this.opts();
      console.warn('running with options', opts);
      const instance = await lookupInstance(opts.pair);
      const spendAction = makePSMSpendAction(instance, agoricNames.brand, opts);
      outputAction(spendAction);
    });

  psm
    .command('vote')
    .description('prepare an offer to vote')
    .option('--offerId [number]', 'Offer id', String(Date.now()))
    .action(function () {
      const opts = this.opts();

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'purse',
          instance: opts.instance,
          description: 'PSM charter member invitation',
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });
    });

  return psm;
};
