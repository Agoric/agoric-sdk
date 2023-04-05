/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global globalThis, process, setTimeout */
import { Nat } from '@endo/nat';
import { Command, InvalidArgumentError } from 'commander';
import { execFileSync as execFileSyncAmbient } from 'child_process';
import { inspect } from 'util';
import {
  makeAgd,
  makeSigner,
  normalizeAddressWithAgd,
  withAgdOptions,
} from '../lib/chain.js';
import { makeBoardClient, makeQueryClient } from '../lib/rpc.js';
import { processOffer } from '../lib/wallet.js';
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

  const tui = makeTUI({ stdout, logger });
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

  const agdDefault = makeAgd({ execFileSync });
  const agdLocal = agdDefault.withOpts(oracle.opts());
  const normalizeAddress = arg =>
    normalizeAddressWithAgd(arg, { agd: agdLocal });

  const ioTools = async () => {
    const qLocal = makeQueryClient({ fetch });
    const qClient = await ('AGORIC_NET' in env
      ? qLocal.withConfig(env.AGORIC_NET)
      : qLocal);
    const board = makeBoardClient(qClient);
    const agoricNames = await board.provideAgoricNames();
    const agd = agdLocal.withOpts({ rpcAddrs: qClient.rpcAddrs });
    const signer = makeSigner({ agd, chainId: qClient.chainName });

    return { board, agoricNames, signer };
  };

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
      normalizeAddress,
    )
    .action(async function (opts) {
      const { board, agoricNames, signer } = await ioTools();
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

      await processOffer({
        toOffer: (_a, _c) => offer,
        sendFrom: opts.sendFrom,
        board,
        tui,
        delay,
        signer,
      });
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
    .requiredOption('--price [number]', 'price (format TODO)', String)
    .action(async function (opts) {
      const { board, signer } = await ioTools();

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

      await processOffer({
        toOffer: (_a, _c) => offer,
        sendFrom: opts.sendFrom,
        board,
        tui,
        delay,
        signer,
      });
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
    .action(async function (opts) {
      const { board, signer } = await ioTools();
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

      await processOffer({
        toOffer: (_a, _c) => offer,
        sendFrom: opts.sendFrom,
        board,
        tui,
        delay,
        signer,
      });
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
    .action(async function (opts) {
      const { pair } = opts;
      const { board } = await ioTools();

      const feed = await board.readLatestHead(
        `published.priceFeed.${pair[0]}-${pair[1]}_price_feed`,
      );

      // XXX add inspect to TUI
      console.log(inspect(feed, { depth: 10, colors: true }));
    });
  return oracle;
};
