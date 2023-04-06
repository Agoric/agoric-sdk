/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global globalThis, process, setTimeout */
import { Nat } from '@endo/nat';
import { Command, InvalidArgumentError } from 'commander';
import { execFileSync as execFileSyncAmbient } from 'child_process';
import { inspect } from 'util';
import { makeAgd, withAgdOptions } from '../lib/chain.js';
import { makeQueryClient } from '../lib/rpc.js';
import { makeAccountFactory } from '../lib/wallet.js';
import { makeTUI } from '../lib/format.js';

// XXX support other decimal places
const COSMOS_UNIT = 1_000_000n;
const scaleDecimals = num => BigInt(num * Number(COSMOS_UNIT));

const lookupPriceAggregatorInstance = (
  [brandIn, brandOut],
  { agoricNames, logger },
) => {
  const name = `${brandIn}-${brandOut} price feed`;
  const instance = agoricNames.instance[name];
  if (!instance) {
    logger.debug('known instances:', agoricNames.instance);
    throw new InvalidArgumentError(`Unknown instance ${name}`);
  }
  return instance;
};

/**
 * @param {import('anylogger').Logger} logger
 * @param io
 */
export const makeOracleCommand = (logger, io = {}) => {
  const {
    // Allow caller to provide access explicitly, but
    // default to conventional ambient IO facilities.
    env = process.env,
    stdout = process.stdout,
    fetch = globalThis.fetch,
    execFileSync = execFileSyncAmbient,
    delay = ms => new Promise(resolve => setTimeout(resolve, ms)),
  } = io;

  const oracle = withAgdOptions(
    new Command('oracle').description('Oracle commands').usage(
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
  agops oracle accept --offerId 12 > offer-12.json
  
  # sign and send
  agoric wallet send --from $WALLET --offer offer-12.json
  `,
    ),
    { env },
  );

  const tui = makeTUI({ stdout, logger });
  const accountFactory = makeAccountFactory({
    tui,
    delay,
    agdLocal: makeAgd({ execFileSync }).withOpts(oracle.opts()),
    qLocal: makeQueryClient({ fetch }),
  });

  oracle
    .command('accept')
    .description('accept invitation to operate an oracle')
    .requiredOption(
      '--pair [brandIn.brandOut]',
      'token pair (brandIn.brandOut)',
      s => s.split('.'),
      ['ATOM', 'USD'],
    )
    .option('--offerId <string>', 'Offer id', Number, Date.now())
    .option(
      '--send-from <address>',
      'wallet address literal or name',
      accountFactory.normalizeAddress,
    )
    .action(async function (opts) {
      const { agoricNames, account } = await accountFactory.makeAccountKit(
        opts.sendFrom,
        env.AGORIC_NET,
      );
      const instance = lookupPriceAggregatorInstance(opts.pair, {
        agoricNames,
        logger,
      });

      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
      const offer = {
        id: Number(opts.offerId),
        invitationSpec: {
          source: 'purse',
          instance,
          description: 'oracle invitation',
        },
        proposal: {},
      };

      await account.processOffer(offer);
    });

  oracle
    .command('pushPrice')
    .description('add a current price sample to a priceAggregator')
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .requiredOption(
      '--oracleAdminAcceptOfferId [number]',
      'offer that had continuing invitation result',
      Number,
    )
    .requiredOption('--price <number>', 'price (format TODO)', String)
    .requiredOption(
      '--from <name-or-addr>',
      'XXX@@@',
      accountFactory.normalizeAddress,
    )
    .action(async function (
      /**
       * @type {{
       *   offerId: number,
       *   oracleAdminAcceptOfferId: number,
       *   price: string,
       *   from: string,
       * }}
       */
      opts,
    ) {
      const { account } = await accountFactory.makeAccountKit(
        opts.from,
        env.AGORIC_NET,
      );
      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
      const offer = {
        id: Number(opts.offerId),
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.oracleAdminAcceptOfferId,
          invitationMakerName: 'PushPrice',
          invitationArgs: harden([opts.price]),
        },
        proposal: {},
      };

      await account.processOffer(offer);
    });

  oracle
    .command('pushPriceRound')
    .description('add a price for a round to a fluxAggregator')
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .requiredOption(
      '--oracleAdminAcceptOfferId [number]',
      'offer that had continuing invitation result',
      Number,
    )
    .requiredOption('--price [number]', 'price', Number)
    .option('--roundId [number]', 'round', Number)
    .requiredOption(
      '--from <name-or-addr>',
      'XXX@@@',
      accountFactory.normalizeAddress,
    )
    .action(async function (
      /**
       * @type {{
       *   offerId: number,
       *   oracleAdminAcceptOfferId: number,
       *   price: number,
       *   roundId?: number,
       *   from: string,
       * }}
       */
      opts,
    ) {
      const { account } = await accountFactory.makeAccountKit(
        opts.from,
        env.AGORIC_NET,
      );

      const unitPrice = scaleDecimals(opts.price);
      const roundId = 'roundId' in opts ? Nat(opts.roundId) : undefined;
      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
      const offer = {
        id: Number(opts.offerId),
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.oracleAdminAcceptOfferId,
          invitationMakerName: 'PushPrice',
          invitationArgs: harden([{ unitPrice, roundId }]),
        },
        proposal: {},
      };

      await account.processOffer(offer);
    });

  oracle
    .command('query')
    .description('return current aggregated (median) price')
    .requiredOption(
      '--pair [brandIn.brandOut]',
      'token pair (brandIn.brandOut)',
      s => s.split('.'),
      ['ATOM', 'USD'],
    )
    .action(async function (
      /**
       * @type {{
       *  pair: [string, string]
       * }}
       */
      opts,
    ) {
      const { pair } = opts;
      const board = await accountFactory.makeBoard(env.AGORIC_NET);

      const feed = await board.readLatestHead(
        `published.priceFeed.${pair[0]}-${pair[1]}_price_feed`,
      );

      // XXX add inspect to TUI
      console.log(inspect(feed, { depth: 10, colors: true }));
    });
  return oracle;
};
