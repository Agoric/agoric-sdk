// @ts-check
/* eslint-disable func-names */
/* eslint-env node */
import {
  fetchEnvNetworkConfig,
  makeAgoricNames,
  makeVstorageKit,
} from '@agoric/client-utils';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { Command } from 'commander';
import { outputActionAndHint } from '../lib/wallet.js';

const networkConfig = await fetchEnvNetworkConfig({ env: process.env, fetch });

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
        const vsk = makeVstorageKit({ fetch }, networkConfig);
        const agoricNames = await makeAgoricNames(vsk.fromBoard, vsk.vstorage);

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
      const vsk = makeVstorageKit({ fetch }, networkConfig);
      const agoricNames = await makeAgoricNames(vsk.fromBoard, vsk.vstorage);

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

  // HACK this hardcodes the set of values to withdraw
  const positions = [
    { "brand": "ATOM", "amount": 533443955, "boardId": "board05557" },
    { "brand": "dATOM", "amount": 10768720, "boardId": "board020374" },
    { "brand": "IST", "amount": 74739567377, "boardId": "board0257" },
    { "brand": "stATOM", "amount": 1689762877, "boardId": "board037112" },
    { "brand": "stOSMO", "amount": 26360713674, "boardId": "board019163" },
    { "brand": "stTIA", "amount": 9171471877, "boardId": "board006172" },
    { "brand": "stkATOM", "amount": 46947, "boardId": "board033183" }
  ];

  reserve
    .command('withdrawAll')
    .description(
      'withdraw all available assets from the reserve using the positions array'
    )
    .requiredOption('--offer-id <string>', 'Offer id', String, `withdrawAllReserve-${now()}`)
    .action(async function (opts) {
      const vsk = makeVstorageKit({ fetch }, networkConfig);
      const agoricNames = await makeAgoricNames(vsk.fromBoard, vsk.vstorage);

      /** @type {Record<string, { brand: string, value: bigint }>} */
      const want = {};
      for (const { brand, amount } of positions) {
        const resolvedBrand = agoricNames.brand[brand];
        if (!resolvedBrand) {
          stderr.write(`Brand ${brand} not found in agoricNames\n`);
          process.exit(1);
        }
        want[brand] = {
          brand: resolvedBrand,
          value: BigInt(amount),
        };
      }

      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'purse',
          instance: agoricNames.instance.reserve,
          invitationMakerName: 'Withdraw Collateral',
          invitationArgs: [], // Fill with actual arguments if needed
        },
        proposal: {
          want,
        },
      };

      outputActionAndHint(
        { method: 'executeOffer', offer },
        { stdout, stderr },
      );
    });

  return reserve;
};
