// @ts-check
import '@endo/init';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { createCommand } from 'commander';
import { makeFollower, makeLeader } from '@agoric/casting';
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

/**
 * @param {{ argv: string[], env: Partial<Record<string, string>>,
 *           stdout: typeof process.stdout, clock: () => number,
 *           execFile: typeof import('child_process').execFile }} process
 * @param {{ fetch: typeof window.fetch }} net
 */
export const main = async ({ argv, env, stdout, clock }, { fetch }) => {
  const interCmd = createCommand('inter')
    .description('Inter Protocol commands')
    .option('--home [dir]', 'agd CosmosSDK application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      'keyring\'s backend (os|file|test) (default "os")',
    );

  const config = await getNetworkConfig(env);
  const { agoricNames, fromBoard } = await makeRpcUtils({ fetch }, config);

  const auctionCmd = interCmd
    .command('auction')
    .description('auction commands');

  auctionCmd
    .command('bid')
    .description('bid on collateral')
    .requiredOption('--giveCurrency [number]', 'Currency to give', Number)
    .requiredOption('--wantCollateral [number]', 'Minted wants', Number)
    .option('--offerId [number]', 'Offer id', Number, clock())
    .option('--collateralBrand [string]', 'Collateral brand key', 'IbcATOM')
    .action(opts => {
      const offer = Offers.auction.bid(opts, agoricNames.brand);
      outputExecuteOfferAction(offer, stdout);
    }); // TODO: discount

  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, auctionCmd.opts());

  auctionCmd
    .command('list')
    .description('list bids')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async opts => {
      const unserializer = boardSlottingMarshaller(fromBoard.convertSlotToVal);

      const networkConfig = await getNetworkConfig(env);
      const leader = makeLeader(networkConfig.rpcAddrs[0]);
      const follower = await makeFollower(
        `:published.wallet.${opts.from}`,
        leader,
        {
          // @ts-expect-error xxx
          unserializer,
        },
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
