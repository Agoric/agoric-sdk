// @ts-check
/* eslint-disable func-names */
/* eslint-env node */
import { Command } from 'commander';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { asPercent } from '../lib/format.js';
import { makeRpcUtils, storageHelper } from '../lib/rpc.js';
import { outputExecuteOfferAction } from '../lib/wallet.js';

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

function collectValues(val, memo) {
  memo.push(val);
  return memo;
}

/**
 * @param {import('anylogger').Logger} logger
 */
export const makePsmCommand = logger => {
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

  const rpcTools = async () => {
    const utils = await makeRpcUtils({ fetch });

    const lookupPsmInstance = ([minted, anchor]) => {
      const name = `psm-${minted}-${anchor}`;
      const instance = utils.agoricNames.instance[name];
      if (!instance) {
        logger.debug('known instances:', utils.agoricNames.instance);
        throw Error(`Unknown instance ${name}`);
      }
      return instance;
    };

    /**
     *
     * @param {[Minted: string, Anchor: string]} pair
     */
    const getGovernanceState = async ([Minted, Anchor]) => {
      const govContent = await utils.vstorage.readLatest(
        `published.psm.${Minted}.${Anchor}.governance`,
      );
      assert(govContent, 'no gov content');
      const { current: governance } = last(
        storageHelper.unserializeTxt(govContent, utils.fromBoard),
      );
      const { [`psm.${Minted}.${Anchor}`]: instance } =
        utils.agoricNames.instance;

      return { instance, governance };
    };

    return { ...utils, lookupPsmInstance, getGovernanceState };
  };

  psm
    .command('list')
    .description('list all PSMs in network')
    .action(async function () {
      const { vstorage } = await rpcTools();
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
    .description('show governance parameters of the PSM')
    // TODO DRY with https://github.com/Agoric/agoric-sdk/issues/6181
    .requiredOption(
      '--pair [Minted.Anchor]',
      'token pair (Minted.Anchor)',
      s => s.split('.'),
      ['IST', 'AUSD'],
    )
    .action(async function (opts) {
      const { pair } = opts;
      const { getGovernanceState } = await rpcTools();
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
    .option('--wantMinted <DOLLARS>', 'amount of anchor tokens to give', Number)
    .option('--giveMinted <DOLLARS>', 'amount of minted tokens to give', Number)
    .option('--feePct [%]', 'Gas fee percentage', Number)
    .option('--offerId <string>', 'Offer id', String, `swap-${Date.now()}`)
    .action(
      async function (
        /** @type {Parameters<typeof Offers.psm.swap>[2]} */ opts,
      ) {
        console.warn('running with options', opts);
        const { agoricNames, lookupPsmInstance } = await rpcTools();
        const instance = await lookupPsmInstance(opts.pair);
        const offer = Offers.psm.swap(agoricNames, instance, opts);
        outputExecuteOfferAction(offer);
      },
    );

  psm
    .command('proposePauseOffers')
    .description('propose a vote')
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `proposePauseOffers-${Date.now()}`,
    )
    .requiredOption(
      '--pair [Minted.Anchor]',
      'token pair (Minted.Anchor)',
      s => s.split('.'),
      ['IST', 'AUSD'],
    )
    .requiredOption(
      '--charterAcceptOfferId <string>',
      'offer that had continuing invitation result',
    )
    .requiredOption(
      '--substring <string>',
      'an offer string to pause (can be repeated)',
      collectValues,
      [],
    )
    .option(
      '--deadline <minutes>',
      'minutes from now to close the vote',
      Number,
      1,
    )
    .action(async function (opts) {
      const { lookupPsmInstance } = await rpcTools();
      const psmInstance = lookupPsmInstance(opts.pair);

      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.charterAcceptOfferId,
          invitationMakerName: 'VoteOnPauseOffers',
          // ( instance, strings list, timer deadline seconds )
          invitationArgs: harden([
            psmInstance,
            opts.substring,
            BigInt(opts.deadline * 60 + Math.round(Date.now() / 1000)),
          ]),
        },
        proposal: {},
      };

      outputExecuteOfferAction(offer);
    });

  psm
    .command('proposeChangeMintLimit')
    .description('propose to change the MintLimit parameter')
    .option(
      '--offerId <string>',
      'id of this offer (optional)',
      String,
      `proposeChangeMintLimit-${Date.now()}`,
    )
    .requiredOption(
      '--pair [Minted.Anchor]',
      'token pair (Minted.Anchor)',
      s => s.split('.'),
      ['IST', 'AUSD'],
    )
    .requiredOption(
      '--previousOfferId <string>',
      'offer using psm charter invitation',
    )
    .requiredOption('--limit <number>', 'new mint limit (in IST)', Number)
    .option(
      '--deadline <minutes>',
      'minutes from now to close the vote',
      Number,
      1,
    )
    .action(async function (opts) {
      const { agoricNames, lookupPsmInstance } = await rpcTools();
      const psmInstance = lookupPsmInstance(opts.pair);

      const istBrand = agoricNames.brand.IST;
      const scaledAmount = harden({
        brand: istBrand,
        value: BigInt(opts.limit * 1_000_000),
      });
      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.previousOfferId,
          invitationMakerName: 'VoteOnParamChange',
        },
        proposal: {},
        offerArgs: {
          instance: psmInstance,
          params: { MintLimit: scaledAmount },
          deadline: BigInt(opts.deadline * 60 + Math.round(Date.now() / 1000)),
        },
      };

      outputExecuteOfferAction(offer);
    });

  return psm;
};
