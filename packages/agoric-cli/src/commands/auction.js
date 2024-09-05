// @ts-check

import { InvalidArgumentError } from 'commander';
import { Fail } from '@endo/errors';
import { makeRpcUtils } from '../lib/rpc.js';
import { outputActionAndHint } from '../lib/wallet.js';

/**
 * @import {ParamTypesMap, ParamTypesMapFromRecord} from '@agoric/governance/src/contractGovernance/typedParamManager.js'
 * @import {ParamValueForType} from '@agoric/governance/src/types.js'
 */

/**
 * @template {ParamTypesMap} M
 * @typedef {{
 *   [K in keyof M]: ParamValueForType<M[K]>
 * }} ParamValues
 */

/** @typedef {ReturnType<import('@agoric/inter-protocol/src/auction/params.js').makeAuctioneerParams>} AuctionParamRecord */
/** @typedef {ParamValues<ParamTypesMapFromRecord<AuctionParamRecord>>} AuctionParams */

/**
 * @param {import('anylogger').Logger} _logger
 * @param {{
 *   createCommand: typeof import('commander').createCommand,
 *   fetch: typeof window.fetch,
 *   stdout: Pick<import('stream').Writable, 'write'>,
 *   stderr: Pick<import('stream').Writable, 'write'>,
 *   now: () => number,
 * }} io
 */
export const makeAuctionCommand = (
  _logger,
  { createCommand, stdout, stderr, fetch, now },
) => {
  const auctioneer = createCommand('auctioneer').description(
    'Auctioneer commands',
  );

  auctioneer
    .command('proposeParamChange')
    .description('propose a change to start frequency')
    .option(
      '--start-frequency <seconds>',
      'how often to start auctions',
      BigInt,
    )
    .option('--price-lock-period <seconds>', 'price lock period', BigInt)
    .option('--clock-step <seconds>', 'descending clock frequency', BigInt)
    .option(
      '--starting-rate <basis-points>',
      'relative to oracle: 999 = 1bp discount',
      BigInt,
    )
    .option('--lowest-rate <basis-points>', 'lower limit for discount', BigInt)
    .option(
      '--discount-step <basis-points>',
      'descending clock step size',
      BigInt,
    )
    .option(
      '--discount-step <integer>',
      'proposed value (basis points)',
      BigInt,
    )
    .requiredOption(
      '--charterAcceptOfferId <string>',
      'offer that had continuing invitation result',
    )
    .option('--offer-id <string>', 'Offer id', String, `propose-${Date.now()}`)
    .option(
      '--deadline <minutes>',
      'minutes from now to close the vote',
      Number,
      1,
    )
    .action(
      /**
       *
       * @param {{
       *   charterAcceptOfferId: string,
       *   startFrequency?: bigint,
       *   clockStep?: bigint,
       *   startingRate?: bigint,
       *   lowestRate?: bigint,
       *   discountStep?: bigint,
       *   priceLockPeriod?: bigint,
       *   offerId: string,
       *   deadline: number,
       * }} opts
       */
      async opts => {
        const { agoricNames, readLatestHead } = await makeRpcUtils({ fetch });

        /** @type {{ current: AuctionParamRecord }} */
        // @ts-expect-error XXX should runtime check?
        const { current } = await readLatestHead(
          `published.auction.governance`,
        );

        const {
          AuctionStartDelay: {
            value: { timerBrand },
          },
        } = current;
        timerBrand || Fail`no timer brand?`;

        /**
         * typed param manager requires RelativeTimeRecord
         * but TimeMath.toRel prodocues a RelativeTime (which may be a bare bigint).
         *
         * @param {bigint} relValue
         * @returns {import('@agoric/time').RelativeTimeRecord}
         */
        const toRel = relValue => ({ timerBrand, relValue });

        /** @type {Partial<AuctionParams>} */
        const params = {
          ...(opts.startFrequency && {
            StartFrequency: toRel(opts.startFrequency),
          }),
          ...(opts.clockStep && { ClockStep: toRel(opts.clockStep) }),
          ...(opts.startingRate && { StartingRate: opts.startingRate }),
          ...(opts.lowestRate && { LowestRate: opts.lowestRate }),
          ...(opts.discountStep && { DiscountStep: opts.discountStep }),
          ...(opts.priceLockPeriod && {
            PriceLockPeriod: toRel(opts.priceLockPeriod),
          }),
        };

        if (Object.keys(params).length === 0) {
          // InvalidArgumentError is a class constructor, and so
          // must be invoked with `new`.
          throw new InvalidArgumentError(`no parameters given`);
        }

        const instance = agoricNames.instance.auctioneer;
        instance || Fail`missing auctioneer in names`;

        const t0 = now();
        const deadline = BigInt(Math.round(t0 / 1000) + 60 * opts.deadline);

        /** @type {import('@agoric/inter-protocol/src/econCommitteeCharter.js').ParamChangesOfferArgs} */
        const offerArgs = {
          deadline,
          params,
          instance,
          path: { paramPath: { key: 'governedParams' } },
        };

        /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
        const offer = {
          id: opts.offerId,
          invitationSpec: {
            source: 'continuing',
            previousOffer: opts.charterAcceptOfferId,
            invitationMakerName: 'VoteOnParamChange',
          },
          offerArgs,
          proposal: {},
        };

        outputActionAndHint(
          { method: 'executeOffer', offer },
          { stdout, stderr },
        );
      },
    );

  return auctioneer;
};
