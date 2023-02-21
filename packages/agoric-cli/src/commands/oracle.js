/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch */
import { Command } from 'commander';
import { inspect } from 'util';
import { makeRpcUtils, storageHelper } from '../lib/rpc.js';
import { outputAction } from '../lib/wallet.js';

const { agoricNames, fromBoard, vstorage } = await makeRpcUtils({ fetch });

/**
 *
 * @param {import('anylogger').Logger} logger
 */
export const makeOracleCommand = async logger => {
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

  const lookupPriceAggregatorInstance = ([brandIn, brandOut]) => {
    const name = `${brandIn}-${brandOut} price feed`;
    const instance = agoricNames.instance[name];
    if (!instance) {
      logger.debug('known instances:', agoricNames.instance);
      throw new Error(`Unknown instance ${name}`);
    }
    return instance;
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
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .action(async function (opts) {
      const instance = lookupPriceAggregatorInstance(opts.pair);

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: Number(opts.offerId),
        invitationSpec: {
          source: 'purse',
          // @ts-expect-error xxx RpcRemote
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
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .requiredOption(
      '--oracleAdminAcceptOfferId [number]',
      'offer that had continuing invitation result',
      Number,
    )
    .requiredOption('--price [number]', 'price (format TODO)', String)
    .action(async function (opts) {
      /** @type {import('../lib/psm.js').OfferSpec} */
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

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
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
    .requiredOption('--price [number]', 'price (per unitAmount)', BigInt)
    .requiredOption('--roundId [number]', 'round', Number)
    .action(async function (opts) {
      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: Number(opts.offerId),
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.oracleAdminAcceptOfferId,
          invitationMakerName: 'PushPrice',
          invitationArgs: harden([
            { unitPrice: opts.price, roundId: opts.roundId },
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

      const capDataStr = await vstorage.readLatest(
        `published.priceFeed.${pair[0]}-${pair[1]}_price_feed`,
      );
      const capDatas = storageHelper.unserializeTxt(capDataStr, fromBoard);

      console.log(inspect(capDatas[0], { depth: 10, colors: true }));
    });
  return oracle;
};
