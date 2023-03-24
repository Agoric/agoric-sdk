// @ts-check
import { M, matches } from '@agoric/store';
import { objectMap } from '@agoric/internal';
import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import {
  boardSlottingMarshaller,
  getNetworkConfig,
  makeRpcUtils,
  storageHelper,
} from 'agoric/src/lib/rpc.js';
import { outputExecuteOfferAction } from 'agoric/src/lib/wallet.js';
import { normalizeAddressWithOptions } from 'agoric/src/lib/chain.js';
import { makeAmountFormatter } from 'agoric/src/lib/format.js';
import { CommanderError } from 'commander';

import { Offers } from '../clientSupport.js';
import { makeBidSpecShape } from '../auction/auctionBook.js';

const { values } = Object;

/** @typedef {import('@agoric/vats/tools/board-utils.js').VBankAssetDetail } AssetDescriptor */

/**
 * Format amounts, prices etc. based on brand board Ids, displayInfo
 *
 * @param {AssetDescriptor[]} assets
 * @returns
 */
const makeFormatters = assets => {
  const fmtAmtTuple = makeAmountFormatter(assets);
  /** @param {Amount} amt */
  const amount = amt => (([l, m]) => `${m}${l}`)(fmtAmtTuple(amt));
  /** @param {Record<string, Amount> | undefined} r */
  const record = r => (r ? objectMap(r, amount) : undefined);
  /** @param {Ratio} r */
  const price = r => {
    const [nl, nm] = fmtAmtTuple(r.numerator);
    const [dl, dm] = fmtAmtTuple(r.denominator);
    return `${Number(nm) / Number(dm)} ${nl}/${dl}`;
  };
  const discount = r =>
    100 - (Number(r.numerator.value) / Number(r.denominator.value)) * 100;
  return { amount, record, price, discount };
};

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
 * Format amounts etc. in a bid OfferStatus
 *
 * @param {import('@agoric/smart-wallet/src/offers.js').OfferStatus &
 *         { offerArgs: import('@agoric/inter-protocol/src/auction/auctionBook.js').BidSpec}} bid
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
    error,
    proposal: { give },
    offerArgs: { want },
    payouts,
  } = bid;
  const props = {
    ...(give ? { give: fmt.record(give) } : {}),
    ...(want ? { want: fmt.amount(want) } : {}),
    ...(payouts ? { payouts: fmt.record(payouts) } : {}),
    ...(error ? { error } : {}),
  };
  return harden({ id, ...spec, ...props });
};

/**
 * @param {{
 *   env: Partial<Record<string, string>>,
 *   stdout: Pick<import('stream').Writable,'write'>,
 *   stderr: Pick<import('stream').Writable,'write'>,
 *   clock: () => number,
 *   createCommand: // Note: includes access to process.stdout, .stderr, .exit
 *     typeof import('commander').createCommand,
 *   execFileSync: typeof import('child_process').execFileSync
 * }} process
 * @param {{ fetch: typeof window.fetch }} net
 */
export const makeInterCommand = async (
  { env, stdout, stderr, clock, execFileSync, createCommand },
  { fetch },
) => {
  const interCmd = createCommand('inter')
    .description('Inter Protocol tool')
    .option('--home [dir]', 'agd CosmosSDK application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      'keyring\'s backend (os|file|test) (default "os")',
    );

  const rpcTools = async () => {
    const networkConfig = await getNetworkConfig(env).catch(err => {
      throw Error(
        `cannot get network config (${env.AGORIC_NET || 'local'}): ${
          err.message
        }`,
      );
    });
    const { agoricNames, fromBoard, vstorage } = await makeRpcUtils(
      { fetch },
      networkConfig,
    ).catch(err => {
      throw new CommanderError(
        1,
        'RPC_FAIL',
        `RPC failure (${env.AGORIC_NET || 'local'}): ${err.message}`,
      );
    });
    const unserializer = boardSlottingMarshaller(fromBoard.convertSlotToVal);
    return { networkConfig, agoricNames, fromBoard, unserializer, vstorage };
  };

  const bigintReplacer = (k, v) => (typeof v === 'bigint' ? `${v}` : v);
  const pprint = v => JSON.stringify(v, bigintReplacer, 2);

  const liquidationCmd = interCmd
    .command('liquidation')
    .description('liquidation commands');
  liquidationCmd
    .command('status')
    .description(
      `show amount liquidating, oracle price

For example:

{
  "liquidatingCollateral": "10IbcATOM",
  "liquidatingDebt": "120IST",
  "price": "12.00 IST/IbcATOM"
}
`,
    )
    .option('--manager [number]', 'Vault Manager', Number, 0)
    .action(async opts => {
      const { agoricNames, vstorage, fromBoard } = await rpcTools();
      const unBoard = txt =>
        storageHelper.unserializeTxt(txt, fromBoard).at(-1);
      const [metrics, quote] = await Promise.all([
        vstorage
          .readLatest(`published.vaultFactory.manager${opts.manager}.metrics`)
          .then(unBoard),
        vstorage
          .readLatest(`published.vaultFactory.manager${opts.manager}.quotes`)
          .then(unBoard),
      ]);
      stdout.write(
        pprint(fmtMetrics(metrics, quote, values(agoricNames.vbankAsset))),
      );
      stdout.write('\n');
    });

  const bidCmd = interCmd
    .command('bid')
    .description('auction bidding commands');

  bidCmd
    .command('by-price')
    .description('Print an offer to bid collateral by price.')
    .requiredOption('--price [number]', 'bid price', Number)
    .requiredOption('--giveCurrency [number]', 'Currency to give', Number)
    .requiredOption('--wantCollateral [number]', 'bid price', Number)
    .option('--collateralBrand [string]', 'Collateral brand key', 'IbcATOM')
    .option('--offerId [number]', 'Offer id', String, `bid-${clock()}`)
    .action(
      /**
       * @param {{
       *   price: number,
       *   giveCurrency: number, wantCollateral: number,
       *   collateralBrand: string,
       *   offerId: string,
       * }} opts
       */
      async ({ collateralBrand, ...opts }) => {
        const { agoricNames } = await rpcTools();
        const offer = Offers.auction.Bid(agoricNames.brand, {
          collateralBrandKey: collateralBrand,
          ...opts,
        });
        outputExecuteOfferAction(offer, stdout);
        stderr.write(
          'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
        );
      },
    );

  bidCmd
    .command('by-discount')
    .description(
      `Print an offer to bid on collateral based on discount from oracle price.`,
    )
    .requiredOption(
      '--discount [number]',
      'bid discount (%)',
      v => Number(v) / 100,
    )
    .requiredOption('--giveCurrency [number]', 'Currency to give', Number)
    .requiredOption('--wantCollateral [number]', 'bid price', Number)
    .option('--collateralBrand [string]', 'Collateral brand key', 'IbcATOM')
    .option('--offerId [number]', 'Offer id', String, `bid-${clock()}`)
    .action(
      /**
       * @param {{
       *   discount: number,
       *   giveCurrency: number,  wantCollateral: number,
       *   collateralBrand: string,
       *   offerId: string,
       * }} opts
       */
      async ({ collateralBrand, ...opts }) => {
        const { agoricNames } = await rpcTools();
        const offer = Offers.auction.Bid(agoricNames.brand, {
          collateralBrandKey: collateralBrand,
          ...opts,
        });
        outputExecuteOfferAction(offer, stdout);
        stderr.write(
          'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
        );
      },
    );

  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, interCmd.opts(), {
      execFileSync,
    });

  bidCmd
    .command('list')
    .description(
      `Show status of bid offers.

For example:

$ inter bid list --from my-acct
{"id":"bid-1679677228803","price":"9 IST/IbcATOM","give":{"Currency":"50IST"},"want":"5IbcATOM"}
{"id":"bid-1679677312341","discount":10,"give":{"Currency":"200IST"},"want":"1IbcATOM"}
`,
    )
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async opts => {
      const { agoricNames, vstorage, fromBoard } = await rpcTools();
      const m = boardSlottingMarshaller(fromBoard.convertSlotToVal);

      const history = await vstorage.readFully(`published.wallet.${opts.from}`);

      /** @type {{ Invitation: Brand<'set'> }} */
      // @ts-expect-error XXX how to narrow AssetKind to set?
      const { Invitation } = agoricNames.brand;
      const coalescer = makeWalletStateCoalescer(Invitation);
      // update with oldest first
      for (const txt of history.reverse()) {
        const { body, slots } = JSON.parse(txt);
        const record = m.unserialize({ body, slots });
        coalescer.update(record);
      }
      const coalesced = coalescer.state;
      const bidInvitationShape = harden({
        source: 'agoricContract',
        instancePath: ['auctioneer'],
        callPipe: [['makeBidInvitation', M.any()]],
      });

      /**
       * @param {import('@agoric/smart-wallet/src/offers.js').OfferStatus} offerStatus
       * @param {typeof console.warn} warn
       */
      const coerceBid = (offerStatus, warn) => {
        const { offerArgs } = offerStatus;
        /** @type {unknown} */
        const collateralBrand = /** @type {any} */ (offerArgs)?.want?.brand;
        if (!collateralBrand) {
          warn('mal-formed bid offerArgs', offerArgs);
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
         *        { offerArgs: import('@agoric/inter-protocol/src/auction/auctionBook.js').BidSpec}}
         */
        // @ts-expect-error dynamic cast
        const bid = offerStatus;
        return bid;
      };

      for (const offerStatus of coalesced.offerStatuses.values()) {
        harden(offerStatus); // coalesceWalletState should do this
        // console.debug(offerStatus.invitationSpec);
        if (!matches(offerStatus.invitationSpec, bidInvitationShape)) continue;

        const bid = coerceBid(offerStatus, console.warn);
        if (!bid) continue;

        const info = fmtBid(bid, values(agoricNames.vbankAsset));
        stdout.write(JSON.stringify(info));
        stdout.write('\n');
      }
    });

  const reserveCmd = interCmd
    .command('reserve')
    .description('reserve commands');
  reserveCmd
    .command('add')
    .description('add collateral to the reserve')
    .requiredOption('--giveCollateral [number]', 'Collateral to give', Number)
    .option('--collateralBrand [string]', 'Collateral brand key', 'IbcATOM')
    .option('--offerId [number]', 'Offer id', String, `bid-${clock()}`)
    .action(
      /**
       * @param {{
       *   giveCollateral: number,
       *   collateralBrand: string,
       *   offerId: string,
       * }} opts
       */
      async ({ collateralBrand, ...opts }) => {
        const { agoricNames } = await rpcTools();
        const offer = Offers.reserve.AddCollateral(agoricNames.brand, {
          collateralBrandKey: collateralBrand,
          ...opts,
        });
        outputExecuteOfferAction(offer, stdout);
      },
    );
  return interCmd;
};
