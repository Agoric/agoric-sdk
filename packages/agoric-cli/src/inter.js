// @ts-check
import '@endo/init';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { createCommand } from 'commander';
import { getNetworkConfig, makeRpcUtils } from './lib/rpc.js';
import { outputExecuteOfferAction } from './lib/wallet.js';

const { Fail } = assert;

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
        want: wantCollateral,
        offerPrice: makeRatioFromAmounts(
          proposal.give.Currency,
          wantCollateral,
        ),
      });
      return {
        id: opts.offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['auction'],
          callPipe: [['getBidInvitation', [collateral.brand]]],
        },
        proposal,
        offerArgs,
      };
    },
  },
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
  const { agoricNames } = await makeRpcUtils({ fetch }, config);

  const auctionCmd = interCmd.command('auction');
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

  interCmd.parse(argv);
};
