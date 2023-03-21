// @ts-check
import '@endo/init';
import { iterateLatest, makeFollower, makeLeader } from '@agoric/casting';
import { M, matches } from '@agoric/store';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { objectMap } from '@agoric/internal';
import { makeBidSpecShape } from '@agoric/inter-protocol/src/auction/auctionBook.js';
import {
  boardSlottingMarshaller,
  getNetworkConfig,
  makeRpcUtils,
} from 'agoric/src/lib/rpc.js';
import {
  coalesceWalletState,
  outputExecuteOfferAction,
} from 'agoric/src/lib/wallet.js';
import { normalizeAddressWithOptions } from 'agoric/src/lib/chain.js';
import { makeAmountFormatter } from 'agoric/src/lib/format.js';
import { CommanderError } from 'commander';

const { values } = Object;

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
 *   stdout: Pick<import('stream').Writable,'write'>, clock: () => number,
 *   createCommand: typeof import('commander').createCommand,
 *   execFileSync: typeof import('child_process').execFileSync
 * }} process
 * Note: createCommand includes access to process.stdout, .stderr, .exit
 * @param {{ fetch: typeof window.fetch }} net
 */
export const makeInterCommand = async (
  { env, stdout, clock, execFileSync, createCommand },
  { fetch },
) => {
  const interCmd = createCommand('inter')
    .description('Inter Protocol commands')
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
    const { agoricNames, fromBoard } = await makeRpcUtils(
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
    return { networkConfig, agoricNames, unserializer };
  };

  const bigintReplacer = (k, v) => (typeof v === 'bigint' ? `${v}` : v);
  const pprint = v => JSON.stringify(v, bigintReplacer, 2);

  const liquidationCmd = interCmd
    .command('liquidation')
    .description('liquidation commands');
  liquidationCmd
    .command('status')
    .description('show liquidation status')
    .option('--manager [number]', 'Vault Manager', Number, 0)
    .action(async opts => {
      const { agoricNames, networkConfig, unserializer } = await rpcTools();
      const leader = makeLeader(networkConfig.rpcAddrs[0]);
      const latest = async path => {
        const follower = makeFollower(
          path,
          leader,
          // @ts-expect-error xxx
          { unserializer },
        );
        let value;
        for await (const it of iterateLatest(follower)) {
          // do anything with it.blockHeight?
          ({ value } = it);
          break;
        }
        return value;
      };
      const [metrics, quote] = await Promise.all([
        latest(`:published.vaultFactory.manager${opts.manager}.metrics`),
        latest(`:published.vaultFactory.manager${opts.manager}.quotes`),
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
    .description('place priced bid on collateral')
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
      },
    );

  bidCmd
    .command('by-discount')
    .description('place discount bid on collateral')
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
      },
    );

  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, bidCmd.opts(), { execFileSync });

  bidCmd
    .command('list')
    .description('list bids')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async opts => {
      const { agoricNames, networkConfig, unserializer } = await rpcTools();

      const leader = makeLeader(networkConfig.rpcAddrs[0]);
      const follower = await makeFollower(
        `:published.wallet.${opts.from}`,
        leader,
        // @ts-expect-error xxx
        { unserializer },
      );

      /** @type {{ Invitation: Brand<'set'> }} */
      // @ts-expect-error XXX how to narrow AssetKind to set?
      const { Invitation } = agoricNames.brand;
      const coalesced = await coalesceWalletState(follower, Invitation);
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

  return interCmd;
};
