/**
 * @file Inter Protocol Liquidation Bidding CLI
 * @see {makeInterCommand} for main function
 */

// @ts-check
import { CommanderError, InvalidArgumentError } from 'commander';
// TODO: should get M from endo https://github.com/Agoric/agoric-sdk/issues/7090
import { makeBidSpecShape } from '@agoric/inter-protocol/src/auction/auctionBook.js';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { objectMap } from '@agoric/internal';
import { M, matches } from '@agoric/store';
import { normalizeAddressWithOptions, pollBlocks } from '../lib/chain.js';
import {
  asBoardRemote,
  bigintReplacer,
  makeAmountFormatter,
} from '../lib/format.js';
import { getNetworkConfig } from '../lib/rpc.js';
import {
  getCurrent,
  makeParseAmount,
  makeWalletUtils,
  outputActionAndHint,
  sendAction,
} from '../lib/wallet.js';

const { values } = Object;

const bidInvitationShape = harden({
  source: 'agoricContract',
  instancePath: ['auctioneer'],
  callPipe: [['makeBidInvitation', M.any()]],
});

/**
 * Contract keywords.
 * "Currency" is scheduled to be renamed to something like Bid. (#7284)
 */
export const KW = /** @type {const} */ {
  Bid: 'Currency',
  Collateral: 'Collateral',
};

/** @typedef {import('@agoric/vats/tools/board-utils.js').VBankAssetDetail } AssetDescriptor */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').TryExitOfferAction } TryExitOfferAction */
/** @typedef {import('@agoric/inter-protocol/src/auction/auctionBook.js').BidSpec}  BidSpec */

/**
 * Format amounts, prices etc. based on brand board Ids, displayInfo
 *
 * @param {AssetDescriptor[]} assets
 */
const makeFormatters = assets => {
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
    return `${Number(nm) / Number(dm)} ${nl}/${dl}`;
  };
  const discount = r =>
    100 - (Number(r.numerator.value) / Number(r.denominator.value)) * 100;
  return { amount, record, price, discount };
};

/**
 * Format amounts in vaultManager metrics for JSON output.
 *
 * @param {*} metrics manager0.metrics
 * @param {*} quote manager0.quote
 * @param {*} assets agoricNames.vbankAssets
 */
const fmtMetrics = (metrics, quote, assets) => {
  const fmt = makeFormatters(assets);
  const { liquidatingCollateral, liquidatingDebt } = metrics;

  const {
    quoteAmount: {
      value: [{ amountIn, amountOut }],
    },
  } = quote;
  const price = fmt.price({ numerator: amountOut, denominator: amountIn });

  const amounts = objectMap(
    { liquidatingCollateral, liquidatingDebt },
    fmt.amount,
  );
  return { ...amounts, price };
};

/**
 * Dynamic check that an OfferStatus is also a BidSpec.
 *
 * @param {import('@agoric/smart-wallet/src/offers.js').OfferStatus} offerStatus
 * @param {Awaited<ReturnType<import('../lib/rpc').makeAgoricNames>>} agoricNames
 * @param {typeof console.warn} warn
 * returns null if offerStatus is not a BidSpec
 */
const coerceBid = (offerStatus, agoricNames, warn) => {
  const { offerArgs } = offerStatus;
  /** @type {unknown} */
  const collateralBrand = /** @type {any} */ (offerArgs)?.maxBuy?.brand;
  if (!collateralBrand) {
    warn('mal-formed bid offerArgs', offerStatus.id, offerArgs);
    return null;
  }
  const bidSpecShape = makeBidSpecShape(
    // @ts-expect-error XXX AssetKind narrowing?
    agoricNames.brand.IST,
    collateralBrand,
  );
  if (!matches(offerStatus.offerArgs, bidSpecShape)) {
    warn('mal-formed bid offerArgs', offerArgs);
    return null;
  }

  /**
   * @type {import('@agoric/smart-wallet/src/offers.js').OfferStatus &
   *        { offerArgs: BidSpec}}
   */
  // @ts-expect-error dynamic cast
  const bid = offerStatus;
  return bid;
};

/**
 * Format amounts etc. in a BidSpec OfferStatus
 *
 * @param {import('@agoric/smart-wallet/src/offers.js').OfferStatus &
 *         { offerArgs: BidSpec}} bid
 * @param {import('agoric/src/lib/format.js').AssetDescriptor[]} assets
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
    proposal: { give },
    offerArgs: { maxBuy },
    payouts,
    result,
    error,
  } = bid;
  const resultProp =
    !error && result && result !== 'UNPUBLISHED' ? { result } : {};
  const props = {
    ...(give ? { give: fmt.record(give) } : {}),
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
 *   stdout: Pick<import('stream').Writable,'write'>,
 *   stderr: Pick<import('stream').Writable,'write'>,
 *   now: () => number,
 *   createCommand: // Note: includes access to process.stdout, .stderr, .exit
 *     typeof import('commander').createCommand,
 *   execFileSync: typeof import('child_process').execFileSync,
 *   setTimeout: typeof setTimeout,
 * }} process
 * @param {{ fetch: typeof window.fetch }} net
 */
export const makeInterCommand = (
  {
    env,
    stdout,
    stderr,
    now,
    setTimeout,
    execFileSync: rawExec,
    createCommand,
  },
  { fetch },
) => {
  const interCmd = createCommand('inter')
    .description('Inter Protocol commands for liquidation bidding etc.')
    .option('--home <dir>', 'agd CosmosSDK application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      `keyring's backend (os|file|test) (default "${
        env.AGORIC_KEYRING_BACKEND || 'os'
      }")`,
      env.AGORIC_KEYRING_BACKEND,
    );

  /** @type {typeof import('child_process').execFileSync} */
  // @ts-expect-error execFileSync is overloaded
  const execFileSync = (file, args, ...opts) => {
    try {
      return rawExec(file, args, ...opts);
    } catch (err) {
      throw new InvalidArgumentError(
        `${err.message}: is ${file} in your $PATH?`,
      );
    }
  };

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
      // eslint-disable-next-line @jessie.js/no-nested-await
      const networkConfig = await getNetworkConfig(env);
      return makeWalletUtils({ fetch, execFileSync, delay }, networkConfig);
    } catch (err) {
      throw new CommanderError(1, 'RPC_FAIL', err.message);
    }
  };

  const liquidationCmd = interCmd
    .command('liquidation')
    .description('liquidation commands');
  liquidationCmd
    .command('status')
    .description(
      `show amount liquidating, vault manager price

For example:

{
  "liquidatingCollateral": "10 IbcATOM",
  "liquidatingDebt": "120 IST",
  "price": "12.00 IST/IbcATOM"
}
`,
    )
    .option('--manager <number>', 'Vault Manager', Number, 0)
    .action(async opts => {
      const { agoricNames, readLatestHead } = await tryMakeUtils();

      const [metrics, quote] = await Promise.all([
        readLatestHead(`published.vaultFactory.manager${opts.manager}.metrics`),
        readLatestHead(`published.vaultFactory.manager${opts.manager}.quotes`),
      ]);
      const info = fmtMetrics(metrics, quote, values(agoricNames.vbankAsset));
      show(info, true);
    });

  const bidCmd = interCmd
    .command('bid')
    .description('auction bidding commands');

  /**
   * @param {string} from
   * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
   * @param {Awaited<ReturnType<tryMakeUtils>>} tools
   */
  const placeBid = async (from, offer, tools) => {
    const { networkConfig, agoricNames, pollOffer } = tools;
    const io = { ...networkConfig, execFileSync, delay, stdout };

    const { home, keyringBackend: backend } = interCmd.opts();
    const result = await sendAction(
      { method: 'executeOffer', offer },
      { keyring: { home, backend }, from, verbose: false, ...io },
    );
    const { timestamp, txhash, height } = result;
    console.error('bid is broadcast:');
    show({ timestamp, height, offerId: offer.id, txhash });
    const found = await pollOffer(from, offer.id, height);
    // TODO: command to wait 'till bid exits?
    const bid = coerceBid(found, agoricNames, console.warn);
    if (!bid) {
      console.warn('malformed bid', found);
      return;
    }
    const info = fmtBid(bid, values(agoricNames.vbankAsset));
    show(info);
  };

  /** @param {string} literalOrName */
  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, interCmd.opts(), {
      execFileSync,
    });

  /**
   * @typedef {{
   *   give: string,
   *   maxBuy: string,
   *   wantMinimum?: string,
   *   offerId: string,
   *   from: string,
   *   generateOnly?: boolean,
   * }} SharedBidOpts
   */

  /** @param {ReturnType<createCommand>} cmd */
  const withSharedBidOptions = cmd =>
    cmd
      .requiredOption(
        '--from <address>',
        'wallet address literal or name',
        normalizeAddress,
      )
      .requiredOption('--give <amount>', 'IST to bid')
      .option(
        '--maxBuy <amount>',
        'max Collateral wanted',
        String,
        '1_000_000IbcATOM',
      )
      .option(
        '--wantMinimum <amount>',
        'only transact a bid that supplies this much collateral',
      )
      .option('--offer-id <string>', 'Offer id', String, `bid-${now()}`)
      .option('--generate-only', 'print wallet action only');

  withSharedBidOptions(bidCmd.command('by-price'))
    .description('Place a bid on collateral by price.')
    .requiredOption('--price <number>', 'bid price (IST/Collateral)', Number)
    .action(
      /**
       * @param {SharedBidOpts & {
       *   price: number,
       * }} opts
       */
      async ({ generateOnly, ...opts }) => {
        const tools = await tryMakeUtils();

        const parseAmount = makeParseAmount(
          tools.agoricNames,
          msg => new InvalidArgumentError(msg),
        );
        const offer = Offers.auction.Bid(tools.agoricNames.brand, {
          ...opts,
          parseAmount,
        });

        if (generateOnly) {
          outputActionAndHint(
            { method: 'executeOffer', offer },
            { stdout, stderr },
          );
          return;
        }
        await placeBid(opts.from, offer, tools);
      },
    );

  /** @param {string} v */
  const parsePercent = v => {
    const p = Number(v);
    if (!(p >= -100 && p <= 100)) {
      throw new InvalidArgumentError('must be between -100 and 100');
    }
    return p / 100;
  };

  withSharedBidOptions(bidCmd.command('by-discount'))
    .description(
      `Place a bid on collateral based on discount from oracle price.`,
    )
    .requiredOption(
      '--discount <percent>',
      'bid discount (0 to 100) or markup (0 to -100) %',
      parsePercent,
    )
    .action(
      /**
       * @param {SharedBidOpts & {
       *   discount: number,
       * }} opts
       */
      async ({ generateOnly, ...opts }) => {
        const tools = await tryMakeUtils();

        const parseAmount = makeParseAmount(
          tools.agoricNames,
          msg => new InvalidArgumentError(msg),
        );
        const offer = Offers.auction.Bid(tools.agoricNames.brand, {
          ...opts,
          parseAmount,
        });
        if (generateOnly) {
          outputActionAndHint(
            { method: 'executeOffer', offer },
            { stdout, stderr },
          );
          return;
        }
        await placeBid(opts.from, offer, tools);
      },
    );

  bidCmd
    .command('cancel')
    .description('Try to exit a bid offer')
    .argument('id', 'offer id (as from bid list)')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .option('--generate-only', 'print wallet action only')
    .action(
      /**
       * @param {string} id
       * @param {{
       *   from: string,
       *   generateOnly?: boolean,
       * }} opts
       */
      async (id, { from, generateOnly }) => {
        /** @type {TryExitOfferAction} */
        const action = { method: 'tryExitOffer', offerId: id };

        if (generateOnly) {
          outputActionAndHint(action, { stdout, stderr });
          return;
        }

        const { networkConfig, readLatestHead } = await tryMakeUtils();

        const current = await getCurrent(from, { readLatestHead });
        const liveIds = current.liveOffers.map(([i, _s]) => i);
        if (!liveIds.includes(id)) {
          throw new InvalidArgumentError(
            `${id} not in live offer ids: ${liveIds}`,
          );
        }

        const io = { ...networkConfig, execFileSync, delay, stdout };

        const { home, keyringBackend: backend } = interCmd.opts();
        const result = await sendAction(action, {
          keyring: { home, backend },
          from,
          verbose: false,
          ...io,
        });
        const { timestamp, txhash, height } = result;
        console.error('cancel action is broadcast:');
        show({ timestamp, height, offerId: id, txhash });

        const checkGone = async blockInfo => {
          const pollResult = await getCurrent(from, { readLatestHead });
          const found = pollResult.liveOffers.find(([i, _]) => i === id);
          if (found) throw Error('retry');
          return blockInfo;
        };
        const blockInfo = await pollBlocks({
          retryMessage: 'offer still live in block',
          ...networkConfig,
          execFileSync,
          delay,
        })(checkGone);
        console.error('bid', id, 'is no longer live');
        show(blockInfo);
      },
    );

  bidCmd
    .command('list')
    .description(
      `Show status of bid offers.

For example:

$ inter bid list --from my-acct
{"id":"bid-1679677228803","price":"9 IST/IbcATOM","give":{"${KW.Bid}":"50IST"},"want":"5IbcATOM"}
{"id":"bid-1679677312341","discount":10,"give":{"${KW.Bid}":"200IST"},"want":"1IbcATOM"}
`,
    )
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .option('--all', 'show exited bids as well')
    .action(
      /**
       * @param {{
       *   from: string,
       *   all?: boolean,
       * }} opts
       */
      async opts => {
        const { agoricNames, readLatestHead, storedWalletState } =
          await tryMakeUtils();

        const [current, state] = await Promise.all([
          getCurrent(opts.from, { readLatestHead }),
          storedWalletState(opts.from),
        ]);
        const entries = opts.all
          ? state.offerStatuses.entries()
          : current.liveOffers;
        for (const [id, spec] of entries) {
          const offerStatus = state.offerStatuses.get(id) || spec;
          harden(offerStatus); // coalesceWalletState should do this
          // console.debug(offerStatus.invitationSpec);
          if (!matches(offerStatus.invitationSpec, bidInvitationShape))
            continue;

          const bid = coerceBid(offerStatus, agoricNames, console.warn);
          if (!bid) continue;

          const info = fmtBid(bid, values(agoricNames.vbankAsset));
          show(info);
        }
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
