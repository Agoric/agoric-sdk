// @ts-check
import '@endo/init';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { iterateLatest, makeFollower, makeLeader } from '@agoric/casting';
import { M, matches } from '@agoric/store';
import {
  boardSlottingMarshaller,
  getNetworkConfig,
  makeRpcUtils,
} from './lib/rpc.js';
import { coalesceWalletState, outputExecuteOfferAction } from './lib/wallet.js';
import { normalizeAddressWithOptions } from './lib/chain.js';
import { makeAmountFormatter } from './lib/format.js';

const { Fail } = assert;
const { entries, fromEntries, values } = Object;

const Offers = {
  auction: {
    /**
     * @param {{
     *   offerId: string,
     *   giveCurrency: number,
     *   wantCollateral: number,
     *   collateralBrand: string,
     *   string
     * }} opts
     * @param {Record<string, Brand>} brands
     * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
     */
    bid: (opts, brands) => {
      const currency = {
        brand: brands.IST || Fail`missing IST brand`,
        unit: 1_000_000n,
        make: qty =>
          harden({
            brand: currency.brand,
            value: BigInt(qty * Number(currency.unit)),
          }),
      };
      const collateral = {
        brand: brands[opts.collateralBrand] || Fail`missing collateral brand`,
        unit: 1_000_000n, // TODO: look up in agoricNames.vbankAssets
        make: qty =>
          harden({
            brand: collateral.brand,
            value: BigInt(qty * Number(collateral.unit)),
          }),
      };

      const proposal = harden({
        give: { Currency: currency.make(opts.giveCurrency) },
      });
      const wantCollateral = collateral.make(opts.wantCollateral);
      const offerArgs = harden({
        want: { Collateral: wantCollateral },
        offerPrice: makeRatioFromAmounts(
          proposal.give.Currency,
          wantCollateral,
        ),
      });
      return {
        id: opts.offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['auctioneer'],
          callPipe: [['makeBidInvitation', [collateral.brand]]],
        },
        proposal,
        offerArgs,
      };
    },
  },
};

const mapValues = (obj, fn) =>
  fromEntries(entries(obj).map(([prop, val]) => [prop, fn(val)]));

const fmtMetrics = (metrics, quote, assets) => {
  const fmtAmtTuple = makeAmountFormatter(assets);
  const fmtAmt = amt => (([l, m]) => `${m}${l}`)(fmtAmtTuple(amt));
  const { liquidatingCollateral, liquidatingDebt } = metrics;

  const {
    quoteAmount: {
      value: [{ amountIn, amountOut }],
    },
  } = quote;
  // TODO: divide num, denom by GCD
  const price = `${fmtAmt(amountOut)}/${fmtAmt(amountIn)}}`;

  const amounts = mapValues({ liquidatingCollateral, liquidatingDebt }, fmtAmt);
  return { ...amounts, price };
};

export const fmtBid = (bid, assets) => {
  const fmtAmtTuple = makeAmountFormatter(assets);
  const fmtAmt = amt => (([l, m]) => `${m}${l}`)(fmtAmtTuple(amt));
  const fmtRecord = r => (r ? mapValues(r, fmtAmt) : undefined);

  const {
    id,
    error,
    proposal: { give },
    offerArgs: { want, offerPrice }, // TODO: other kind of bid
    payouts,
  } = bid;
  const amounts = {
    give: give ? fmtRecord(give) : undefined,
    want: want ? fmtAmt(want) : undefined,
    price: offerPrice
      ? `${fmtAmt(offerPrice.numerator)}/${fmtAmt(offerPrice.denominator)}}`
      : undefined,
    payouts: fmtRecord(payouts),
  };
  return harden({ id, ...amounts, error });
};

/** distinguish IO errors etc. from logic bugs */
export class RuntimeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RuntimeError';
  }
}

/**
 * @param {{
 *   argv: string[], env: Partial<Record<string, string>>,
 *   stdout: typeof process.stdout, clock: () => number,
 *   createCommand: typeof import('commander').createCommand,
 *   execFile: typeof import('child_process').execFile
 * }} process
 * Note: createCommand includes access to process.stdout, .stderr, .exit
 * @param {{ fetch: typeof window.fetch }} net
 */
export const main = async (
  { argv, env, stdout, clock, createCommand },
  { fetch },
) => {
  const interCmd = createCommand('inter')
    .description('Inter Protocol commands')
    .option('--home [dir]', 'agd CosmosSDK application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      'keyring\'s backend (os|file|test) (default "os")',
    );

  // XXX attempting IO before arg parsing leads to poor diagnostis
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
    throw new RuntimeError(
      `RPC failure (${env.AGORIC_NET || 'local'}): ${err.message}`,
    );
  });
  const unserializer = boardSlottingMarshaller(fromBoard.convertSlotToVal);

  const bigintReplacer = (k, v) => (typeof v === 'bigint' ? `${v}` : v);

  const liquidationCmd = interCmd
    .command('liquidation')
    .description('liquidation commands');
  liquidationCmd
    .command('status')
    .description('show liquidation status')
    .option('--manager [number]', 'Vault Manager', Number, 0)
    .action(async opts => {
      const leader = makeLeader(networkConfig.rpcAddrs[0]);
      const pathFollower = path =>
        makeFollower(
          path,
          leader,
          // @ts-expect-error xxx
          { unserializer },
        );
      const metricsFollower = await pathFollower(
        `:published.vaultFactory.manager${opts.manager}.metrics`,
      );
      let metrics;
      for await (const it of iterateLatest(metricsFollower)) {
        // do anything with it.blockHeight?
        metrics = it.value;
        break;
      }
      const quoteFollower = await pathFollower(
        `:published.vaultFactory.manager${opts.manager}.quotes`,
      );
      let quote;
      for await (const it of iterateLatest(quoteFollower)) {
        quote = it.value;
        break;
      }
      stdout.write(
        JSON.stringify(
          fmtMetrics(metrics, quote, values(agoricNames.vbankAsset)),
          bigintReplacer,
          2,
        ),
      );
      stdout.write('\n');
    });

  const bidCmd = interCmd
    .command('bid')
    .description('auction bidding commands');

  bidCmd
    .command('place')
    .description('place bid on collateral')
    .requiredOption('--giveCurrency [number]', 'Currency to give', Number)
    .requiredOption('--wantCollateral [number]', 'Minted wants', Number)
    .option('--offerId [number]', 'Offer id', Number, clock())
    .option('--collateralBrand [string]', 'Collateral brand key', 'IbcATOM')
    .action(opts => {
      const offer = Offers.auction.bid(opts, agoricNames.brand);
      outputExecuteOfferAction(offer, stdout);
    }); // TODO: discount

  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, bidCmd.opts());

  bidCmd
    .command('list')
    .description('list bids')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async opts => {
      const leader = makeLeader(networkConfig.rpcAddrs[0]);
      const follower = await makeFollower(
        `:published.wallet.${opts.from}`,
        leader,
        // @ts-expect-error xxx
        { unserializer },
      );

      const coalesced = await coalesceWalletState(
        follower,
        agoricNames.brand.Invitation,
      );
      const bidInvitationShape = harden({
        source: 'agoricContract',
        instancePath: ['auctioneer'],
        callPipe: [['makeBidInvitation', M.any()]],
      });
      for (const offerStatus of coalesced.offerStatuses.values()) {
        harden(offerStatus); // coalesceWalletState should do this
        // console.debug(offerStatus.invitationSpec);
        if (!matches(offerStatus.invitationSpec, bidInvitationShape)) continue;

        const info = fmtBid(offerStatus, values(agoricNames.vbankAsset));
        stdout.write(JSON.stringify(info));
        stdout.write('\n');
      }
    }); // TODO: discount

  interCmd.parse(argv);
};
