// @ts-check
/* eslint-disable func-names */
/* eslint-env node */
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { Command } from 'commander';
import { makeRpcUtils } from '../lib/rpc.js';
import { outputActionAndHint } from '../lib/wallet.js';

/**
 * @param {import('anylogger').Logger} _logger
 * @param {*} io
 */
export const makeReserveCommand = (_logger, io = {}) => {
  const { stdout = process.stdout, stderr = process.stderr, now } = io;
  const reserve = new Command('reserve').description('Asset Reserve commands');

  reserve
    .command('add')
    .description('add collateral to the reserve')
    .requiredOption('--give <number>', 'Collateral to give', Number)
    .option('--collateral-brand <string>', 'Collateral brand key', 'ATOM')
    .option('--offer-id <string>', 'Offer id', String, `addCollateral-${now()}`)
    .action(
      /**
       * @param {{
       *   give: number,
       *   collateralBrand: string,
       *   offerId: string,
       * }} opts
       */
      async ({ collateralBrand, ...opts }) => {
        const { agoricNames } = await makeRpcUtils({ fetch });

        const offer = Offers.reserve.AddCollateral(agoricNames, {
          collateralBrandKey: collateralBrand,
          ...opts,
        });
        outputActionAndHint(
          { method: 'executeOffer', offer },
          { stdout, stderr },
        );
      },
    );

  reserve
    .command('proposeBurn')
    .description('propose a call to burnFeesToReduceShortfall')
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `proposePauseOffers-${Date.now()}`,
    )
    .requiredOption(
      '--charterAcceptOfferId <string>',
      'offer that had continuing invitation result',
    )
    .requiredOption('--value [integer]', 'value of µIST to burn', BigInt)
    .option(
      '--deadline <minutes>',
      'minutes from now to close the vote',
      Number,
      1,
    )
    .action(async function (opts) {
      const { agoricNames } = await makeRpcUtils({ fetch });

      const reserveInstance = agoricNames.instance.reserve;
      assert(reserveInstance, 'missing reserve in names');

      const feesToBurn = { brand: agoricNames.brand.IST, value: opts.value };

      /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
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

      outputActionAndHint(
        { method: 'executeOffer', offer },
        { stdout, stderr },
      );
    });

  return reserve;
};
