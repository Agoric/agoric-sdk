import { AmountMath } from '@agoric/ertp';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import { makeScalarBigMapStore } from '@agoric/vat-data/src/index.js';
import { providePriceAuthorityRegistry } from '@agoric/vats/src/priceAuthorityRegistry.js';
import {
  makePriceQuoteIssuer,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';

import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority.js';
import { E } from '@endo/eventual-send';
import {
  SECONDS_PER_WEEK,
  setupReserve,
  startAuctioneer,
} from '../../src/proposals/econ-behaviors.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import {
  installPuppetGovernance,
  produceInstallations,
  setupBootstrap,
} from '../supports.js';

export const BASIS_POINTS = 10000n;

/**
 * @import {AmountUtils} from '@agoric/zoe/tools/test-utils.js';
 * @import {IssuerKit} from '@agoric/ertp';
 * @import {PriceDescription} from '@agoric/zoe/tools/types.js';
 */

/**
 * @typedef {Record<string, any> & {
 *   aeth: IssuerKit & AmountUtils;
 *   run: IssuerKit & AmountUtils;
 *   bundleCache: Awaited<
 *     ReturnType<
 *       typeof import('@agoric/swingset-vat/tools/bundleTool.js').unsafeMakeBundleCache
 *     >
 *   >;
 *   rates: VaultManagerParamValues;
 *   interestTiming: InterestTiming;
 *   zoe: ZoeService;
 * }} Context
 */

/**
 * dL: 1M, lM: 105%, lP: 10%, iR: 100, lF: 500
 *
 * @param {Brand<'nat'>} debtBrand
 */
export const defaultParamValues = debtBrand =>
  harden({
    debtLimit: AmountMath.make(debtBrand, 1_000_000n),
    // margin required to maintain a loan
    liquidationMargin: makeRatio(105n, debtBrand),
    // penalty upon liquidation as proportion of debt
    liquidationPenalty: makeRatio(10n, debtBrand),
    // periodic interest rate (per charging period)
    interestRate: makeRatio(100n, debtBrand, BASIS_POINTS),
    // charge to create or increase loan balance
    mintFee: makeRatio(500n, debtBrand, BASIS_POINTS),
    // NB: liquidationPadding defaults to zero in contract
  });

/**
 * @param {import('ava').ExecutionContext<Context>} t
 * @param {IssuerKit<'nat'>} run
 * @param {IssuerKit<'nat'>} aeth
 * @param {NatValue[] | Ratio} priceOrList
 * @param {RelativeTime} quoteInterval
 * @param {Amount | undefined} unitAmountIn
 * @param {Partial<import('../../src/auction/params.js').AuctionParams>} actionParamArgs
 */
export const setupElectorateReserveAndAuction = async (
  t,
  run,
  aeth,
  priceOrList,
  quoteInterval,
  unitAmountIn,
  {
    StartFrequency = SECONDS_PER_WEEK,
    DiscountStep = 2000n,
    LowestRate = 5500n,
    ClockStep = 2n,
    StartingRate = 10_500n,
    AuctionStartDelay = 10n,
    PriceLockPeriod = 3n,
  },
) => {
  const {
    zoe,
    electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
    timer,
  } = t.context;

  const space = await setupBootstrap(t, timer);
  installPuppetGovernance(zoe, space.installation.produce);
  produceInstallations(space, t.context.installation);

  await startEconomicCommittee(space, electorateTerms);
  await setupReserve(space);
  const quoteIssuerKit = makePriceQuoteIssuer();

  // priceAuthorityReg is the registry, which contains and multiplexes multiple
  // individual priceAuthorities, including aethPriceAuthority.
  // priceAuthorityAdmin supports registering more individual priceAuthorities
  // with the registry.
  /** @type {import('@agoric/zoe/tools/manualPriceAuthority.js').ManualPriceAuthority} */
  // @ts-expect-error scriptedPriceAuthority doesn't actually match this, but manualPriceAuthority does
  const aethTestPriceAuthority = Array.isArray(priceOrList)
    ? makeScriptedPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        priceList: priceOrList,
        timer,
        quoteMint: quoteIssuerKit.mint,
        unitAmountIn,
        quoteInterval,
      })
    : makeManualPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        initialPrice: priceOrList,
        timer,
        quoteIssuerKit,
      });
  const baggage = makeScalarBigMapStore('baggage');
  const { priceAuthority: priceAuthorityReg, adminFacet: priceAuthorityAdmin } =
    providePriceAuthorityRegistry(baggage);
  await E(priceAuthorityAdmin).registerPriceAuthority(
    aethTestPriceAuthority,
    aeth.brand,
    run.brand,
  );

  space.produce.priceAuthority.resolve(priceAuthorityReg);

  const auctionParams = {
    StartFrequency,
    ClockStep,
    StartingRate,
    LowestRate,
    DiscountStep,
    AuctionStartDelay,
    PriceLockPeriod,
  };

  await startAuctioneer(space, { auctionParams });
  return {
    space,
    priceAuthority: priceAuthorityReg,
    priceAuthorityAdmin,
    aethTestPriceAuthority,
  };
};

/**
 * @param {import('ava').ExecutionContext<any>} t
 * @param {bigint} amount
 */
export const getRunFromFaucet = async (t, amount) => {
  const {
    installation: { faucet: installation },
    zoe,
    feeMintAccess,
    run,
  } = t.context;
  /** @type {Promise<Installation<import('./faucet.js').start>>} */
  // On-chain, there will be pre-existing RUN. The faucet replicates that
  // @ts-expect-error
  const { creatorFacet: faucetCreator } = await E(zoe).startInstance(
    installation,
    {},
    {},
    harden({ feeMintAccess }),
  );
  const faucetSeat = E(zoe).offer(
    await E(faucetCreator).makeFaucetInvitation(),
    harden({
      give: {},
      want: { RUN: run.make(amount) },
    }),
    harden({}),
  );

  const runPayment = await E(faucetSeat).getPayout('RUN');
  return runPayment;
};

/**
 * Vault offer result used to include `publicNotifiers` but now is
 * `publicSubscribers`.
 *
 * @param {UserSeat<VaultKit>} vaultSeat
 */
export const legacyOfferResult = vaultSeat => {
  return E(vaultSeat)
    .getOfferResult()
    .then(result => {
      const { vault, publicSubscribers } = result;
      assert(vault, 'missing vault');
      assert(publicSubscribers, 'missing publicSubscribers');
      return {
        vault,
        publicNotifiers: {
          vault: makeNotifierFromSubscriber(publicSubscribers.vault.subscriber),
        },
      };
    });
};
