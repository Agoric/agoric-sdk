/**
 * @file Inter Protocol Liquidation Bidding CLI
 * @see {makeInterCommand} for main function
 */

// @ts-check
import { fetchEnvNetworkConfig, makeWalletUtils } from '@agoric/client-utils';
import { objectMap } from '@agoric/internal';
import { CommanderError } from 'commander';
import {
  asBoardRemote,
  bigintReplacer,
  makeAmountFormatter,
} from '../lib/format.js';

/**
 * @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js';
 * @import {Timestamp} from '@agoric/time';
 * @import {RelativeTimeRecord} from '@agoric/time';
 * @import {OfferStatus} from '@agoric/smart-wallet/src/offers.js';
 * @import {AgoricNamesRemotes} from '@agoric/vats/tools/board-utils.js';
 * @import {Writable} from 'stream';
 * @import {createCommand} from 'commander';
 * @import {execFileSync} from 'child_process';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 */
/** @import {TryExitOfferAction} from '@agoric/smart-wallet/src/smartWallet.js'; */
/** @import {OfferSpec as BidSpec} from '@agoric/inter-protocol/src/auction/auctionBook.js' */
/** @import {ScheduleNotification} from '@agoric/inter-protocol/src/auction/scheduler.js' */
/** @import {BookDataNotification} from '@agoric/inter-protocol/src/auction/auctionBook.js' */

/**
 * Format amounts, prices etc. based on brand board Ids, displayInfo
 *
 * @param {VBankAssetDetail[]} assets
 */
const makeFormatters = assets => {
  const r4 = x => Math.round(x * 10_000) / 10_000;

  const br = asBoardRemote;
  const fmtAmtTuple = makeAmountFormatter(assets);

  /** @param {Amount} amt */
  const amount = amt => (([l, m]) => `${m} ${l}`)(fmtAmtTuple(br(amt)));
  /** @param {Record<string, Amount> | undefined} r */
  const record = r => (r ? objectMap(r, amount) : undefined);
  /** @param {Ratio} r */
  const price = r => {
    const [nl, nm] = fmtAmtTuple(br(r.numerator));
    const [dl, dm] = fmtAmtTuple(br(r.denominator));
    return `${r4(Number(nm) / Number(dm))} ${nl}/${dl}`;
  };
  /** @param {Ratio} r */
  const discount = r =>
    r4(100 - (Number(r.numerator.value) / Number(r.denominator.value)) * 100);

  // XXX real TimeMath.absValue requires real Remotable timerBrand
  /** @param {Timestamp} ts */
  const absValue = ts => (typeof ts === 'bigint' ? ts : ts.absValue);

  /** @param {Timestamp} tr */
  const absTime = tr => new Date(Number(absValue(tr)) * 1000).toISOString();
  /** @param {RelativeTimeRecord} tr */
  const relTime = tr =>
    new Date(Number(tr.relValue) * 1000).toISOString().slice(11, 19);

  /** @param {bigint} bp */
  const basisPoints = bp => `${(Number(bp) / 100).toFixed(2)}%`;

  /**
   * @template T
   * @param {(_: T) => string} f
   * @returns { (x: T | null | undefined ) => string | undefined }
   */
  const maybe = f => x => (x ? f(x) : undefined);

  return {
    amount,
    amountOpt: maybe(amount),
    record,
    price,
    priceOpt: maybe(price),
    discount,
    absTime,
    absTimeOpt: maybe(absTime),
    relTime,
    basisPoints,
  };
};

/**
 * Format amounts etc. in a BidSpec OfferStatus
 *
 * @param {OfferStatus &
 *         { offerArgs: BidSpec}} bid
 * @param {VBankAssetDetail[]} assets
 */
export const fmtBid = (bid, assets) => {
  const fmt = makeFormatters(assets);

  const { offerArgs } = bid;
  /** @type {{ price: string } | { discount: number }} */
  const spec =
    'offerPrice' in offerArgs
      ? { price: fmt.price(offerArgs.offerPrice) }
      : { discount: fmt.discount(offerArgs.offerBidScaling) };

  const {
    id,
    proposal: { give, want },
    offerArgs: { maxBuy },
    payouts,
    result,
    error,
  } = bid;
  const resultProp =
    !error && result && result !== 'UNPUBLISHED' ? { result } : {};
  const props = {
    ...(give ? { give: fmt.record(give) } : {}),
    ...(want ? { give: fmt.record(want) } : {}),
    ...(maxBuy ? { maxBuy: fmt.amount(maxBuy) } : {}),
    ...(payouts ? { payouts: fmt.record(payouts) } : resultProp),
    ...(error ? { error } : {}),
  };
  return harden({ id, ...spec, ...props });
};

/**
 * Make Inter Protocol liquidation bidding commands.
 *
 * @param {{
 *   env: Partial<Record<string, string>>,
 *   stdout: Pick<Writable,'write'>,
 *   stderr: Pick<Writable,'write'>,
 *   now: () => number,
 *   createCommand: // Note: includes access to process.stdout, .stderr, .exit
 *     typeof createCommand,
 *   execFileSync: typeof execFileSync,
 *   setTimeout: typeof setTimeout,
 * }} process
 * @param {{ fetch: typeof window.fetch }} net
 */
export const makeInterCommand = (
  { env, stdout, setTimeout, createCommand },
  { fetch },
) => {
  const interCmd = createCommand('inter')
    .description('Inter Protocol commands for liquidation bidding etc.')
    .option('--home <dir>', 'agd CosmosSDK application home directory')
    .option(
      '--fees <amount>',
      'set fees for transaction broadcast (e.g. 5000ubld)',
    )
    .option(
      '--keyring-backend <os|file|test>',
      `keyring's backend (os|file|test) (default "${
        env.AGORIC_KEYRING_BACKEND || 'os'
      }")`,
      env.AGORIC_KEYRING_BACKEND,
    );

  /** @param {number} ms */
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const show = (info, indent = false) =>
    stdout.write(
      `${JSON.stringify(info, bigintReplacer, indent ? 2 : undefined)}\n`,
    );

  const tryMakeUtils = async () => {
    await null;
    try {
      // XXX pass fetch to getNetworkConfig() explicitly
      // await null above makes this await safe
      const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
      return makeWalletUtils({ fetch, delay }, networkConfig);
    } catch (err) {
      // CommanderError is a class constructor, and so
      // must be invoked with `new`.
      throw new CommanderError(1, 'RPC_FAIL', err.message);
    }
  };

  const auctionCmd = interCmd
    .command('auction')
    .description('auction commands');
  auctionCmd
    .command('status')
    .description(
      `show auction status in JSON format

For example:

inter auction status
{
  "schedule": {
    "activeStartTime": "2023-04-19T22:50:02.000Z",
    "nextStartTime": "2023-04-19T23:00:02.000Z",
    "nextDescendingStepTime": "2023-04-19T22:51:02.000Z"
  },
  "book0": {
    "startPrice": "12.34 IST/ATOM",
    "currentPriceLevel": "11.723 IST/ATOM",
    "startCollateral": "0 ATOM",
    "collateralAvailable": "0 ATOM"
  },
  "params": {
    "DiscountStep": "5.00%",
    "ClockStep": "00:00:20",
    "LowestRate": "45.00%"
  }
}
`,
    )
    .option('--book <number>', 'Auction Book', Number, 0)
    .action(
      async (
        /**
         * @type {{
         *   book: number,
         * }}
         */ opts,
      ) => {
        const { agoricNames, readPublished } = await tryMakeUtils();

        const [schedule, book, { current: params }] = await Promise.all([
          readPublished('auction.schedule'),
          readPublished(`auction.book${opts.book}`),
          readPublished('auction.governance'),
        ]);

        const fmt = makeFormatters(Object.values(agoricNames.vbankAsset));
        const info = {
          schedule: {
            activeStartTime: fmt.absTimeOpt(schedule.activeStartTime),
            nextStartTime: fmt.absTimeOpt(schedule.nextStartTime),
            nextDescendingStepTime: fmt.absTimeOpt(
              schedule.nextDescendingStepTime,
            ),
          },
          [`book${opts.book}`]: {
            startPrice: fmt.priceOpt(book.startPrice),
            currentPriceLevel: fmt.priceOpt(book.currentPriceLevel),
            startProceedsGoal: fmt.amountOpt(book.startProceedsGoal),
            remainingProceedsGoal: fmt.amountOpt(book.remainingProceedsGoal),
            proceedsRaised: fmt.amountOpt(book.proceedsRaised),
            startCollateral: fmt.amount(book.startCollateral),
            collateralAvailable: fmt.amountOpt(book.collateralAvailable),
          },
          params: {
            DiscountStep: fmt.basisPoints(params.DiscountStep.value),
            ClockStep: fmt.relTime(params.ClockStep.value),
            LowestRate: fmt.basisPoints(params.LowestRate.value),
          },
        };

        show(info, true);
      },
    );

  const assetCmd = interCmd
    .command('vbank')
    .description('vbank asset commands');
  assetCmd
    .command('list')
    .description('list registered assets with decimalPlaces, boardId, etc.')
    .action(async () => {
      const { agoricNames } = await tryMakeUtils();
      const assets = Object.values(agoricNames.vbankAsset).map(a => {
        return {
          issuerName: a.issuerName,
          denom: a.denom,
          brand: { boardId: a.brand.getBoardId() },
          displayInfo: { decimalPlaces: a.displayInfo.decimalPlaces },
        };
      });
      show(assets, true);
    });

  return interCmd;
};
