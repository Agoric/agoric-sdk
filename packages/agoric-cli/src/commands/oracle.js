/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch */
import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { Nat } from '@endo/nat';
import { Command } from 'commander';
import { inspect } from 'util';
import { makeRpcUtils, storageHelper } from '../lib/rpc.js';
import { getCurrent, outputAction } from '../lib/wallet.js';

// XXX support other decimal places
const COSMOS_UNIT = 1_000_000n;
const scaleDecimals = num => BigInt(num * Number(COSMOS_UNIT));

/**
 * @param {import('anylogger').Logger} logger
 */
export const makeOracleCommand = logger => {
  const oracle = new Command('oracle').description('Oracle commands').usage(
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
  );

  const rpcTools = async () => {
    const utils = await makeRpcUtils({ fetch });

    const lookupPriceAggregatorInstance = ([brandIn, brandOut]) => {
      const name = `${brandIn}-${brandOut} price feed`;
      const instance = utils.agoricNames.instance[name];
      if (!instance) {
        logger.debug('known instances:', utils.agoricNames.instance);
        throw Error(`Unknown instance ${name}`);
      }
      return instance;
    };

    return { ...utils, lookupPriceAggregatorInstance };
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
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `oracleAccept-${Date.now()}`,
    )
    .action(async function (opts) {
      const { lookupPriceAggregatorInstance } = await rpcTools();
      const instance = lookupPriceAggregatorInstance(opts.pair);

      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'purse',
          instance,
          description: 'oracle invitation',
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  oracle
    .command('pushPrice')
    .description('add a current price sample to a priceAggregator')
    .option('--offerId <string>', 'Offer id', String, `pushPrice-${Date.now()}`)
    .requiredOption(
      '--oracleAdminAcceptOfferId <number>',
      'offer that had continuing invitation result',
      Number,
    )
    .requiredOption('--price <number>', 'price (format TODO)', String)
    .action(async function (opts) {
      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.oracleAdminAcceptOfferId,
          invitationMakerName: 'PushPrice',
          invitationArgs: harden([opts.price]),
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  oracle
    .command('pushPriceRound')
    .description('add a price for a round to a fluxAggregator')
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `pushPriceRound-${Date.now()}`,
    )
    .requiredOption(
      '--oracleAdminAcceptOfferId <string>',
      'offer that had continuing invitation result',
      String,
    )
    .requiredOption('--price <number>', 'price', Number)
    .option('--roundId <number>', 'round', Number)
    .action(async function (opts) {
      const { offerId } = opts;
      const unitPrice = scaleDecimals(opts.price);
      const roundId = 'roundId' in opts ? Nat(opts.roundId) : undefined;

      const offer = Offers.fluxAggregator.PushPrice(
        {},
        { offerId, unitPrice, roundId },
        opts.oracleAdminAcceptOfferId,
      );

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  oracle
    .command('find-continuing-id')
    .description('print id of specified oracle continuing invitation')
    .requiredOption('--from <address>', 'from address', String)
    .action(async opts => {
      const { readLatestHead } = await makeRpcUtils({ fetch });
      const current = await getCurrent(opts.from, { readLatestHead });

      const { offerToUsedInvitation: entries } = /** @type {any} */ (current);
      Array.isArray(entries) || Fail`entries must be an array: ${entries}`;

      for (const [offerId, { value }] of entries) {
        /** @type {{ description: string, instance: unknown }[]} */
        const [{ description }] = value;
        if (description === 'oracle invitation') {
          console.log(offerId);
          return;
        }
      }

      console.error('No continuing ids found');
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
      const { vstorage, fromBoard } = await rpcTools();

      const capDataStr = await vstorage.readLatest(
        `published.priceFeed.${pair[0]}-${pair[1]}_price_feed`,
      );
      const capDatas = storageHelper.unserializeTxt(capDataStr, fromBoard);

      console.log(inspect(capDatas[0], { depth: 10, colors: true }));
    });
  return oracle;
};
