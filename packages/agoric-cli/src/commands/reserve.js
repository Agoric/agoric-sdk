/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch */
import { Command } from 'commander';
import { makeRpcUtils } from '../lib/rpc.js';
import { outputExecuteOfferAction } from '../lib/wallet.js';

const { agoricNames } = await makeRpcUtils({ fetch });

/**
 *
 * @param {import('anylogger').Logger} _logger
 */
export const makeReserveCommand = async _logger => {
  const reserve = new Command('reserve').description('Asset Reserve commands');

  reserve
    .command('proposeBurn')
    .description('propose a call to burnFeesToReduceShortfall')
    .option(
      '--offerId [string]',
      'Offer id',
      String,
      `proposePauseOffers-${Date.now()}`,
    )
    .requiredOption(
      '--charterAcceptOfferId [string]',
      'offer that had continuing invitation result',
    )
    .requiredOption('--value [integer]', 'value of µIST to burn', BigInt)
    .option(
      '--deadline [minutes]',
      'minutes from now to close the vote',
      Number,
      1,
    )
    .action(async function (opts) {
      const reserveInstance = agoricNames.instance.reserve;
      assert(reserveInstance, 'missing reserve in names');

      const feesToBurn = { brand: agoricNames.brand.IST, value: opts.value };

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.charterAcceptOfferId,
          invitationMakerName: 'VoteOnApiCall',
          invitationArgs: harden([
            reserveInstance,
            'burnFeesToReduceShortfall',
            [feesToBurn],
            BigInt(opts.deadline * 60 + Math.round(Date.now() / 1000)),
          ]),
        },
        proposal: {},
      };

      outputExecuteOfferAction(offer);

      console.warn('Now execute the prepared offer');
    });

  return reserve;
};
