import { E } from '@endo/eventual-send';
import '@agoric/notifier/exported.js';
import '@agoric/time';
import { makeIssuerKit, AssetKind } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import '../../src/vaultFactory/types.js';
import '@agoric/zoe/exported.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import { makeScalarBigMapStore } from '@agoric/vat-data/src/index.js';
import { providePriceAuthorityRegistry } from '@agoric/vats/src/priceAuthorityRegistry.js';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import { makePromiseSpace, makeAgoricNamesAccess } from '@agoric/vats';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { produceDiagnostics } from '@agoric/vats/src/core/basic-behaviors.js';
import { Far } from '@endo/far';
import { bindAllMethods } from '@agoric/internal/src/method-tools.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { installPuppetGovernance, produceInstallations } from '../supports.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import {
  SECONDS_PER_WEEK,
  setupReserve,
  startAuctioneer,
} from '../../src/proposals/econ-behaviors.js';

/**
 * @param {ERef<StorageNode>} chainStorageP
 * @param {Map<string, Promise>} childrenMap
 */
export const makeStorageWrapper = async (chainStorageP, childrenMap) => {
  let childNodesBlocked = false;

  const chainStorage = await chainStorageP;
  return Far('StorageWrapper', {
    ...bindAllMethods(chainStorage),
    makeChildNode: nodeName => {
      if (childNodesBlocked === true) {
        return Promise.reject(new Error('Child nodes blocked'));
      }

      const child = makeStorageWrapper(
        E(chainStorage).makeChildNode(nodeName),
        childrenMap,
      );
      childrenMap.set(nodeName, child);

      return child;
    },
    toggleChildrenBlocked: () => (childNodesBlocked = !childNodesBlocked),
  });
};

/**
 * @param {any} t
 * @param {import('@agoric/time/src/types.js').TimerService} [optTimer]
 */
const setupBootstrap = async (t, optTimer) => {
  const trace = makeTracer('PromiseSpace', false);
  const space = /** @type {any} */ (makePromiseSpace(trace));
  const { produce, consume } = /**
   * @type {import('../../src/proposals/econ-behaviors.js').EconomyBootstrapPowers &
   *     BootstrapPowers}
   */ (space);

  await produceDiagnostics(space);
  const childrenNodes = new Map();

  const timer = optTimer || buildManualTimer(t.log);
  produce.chainTimerService.resolve(timer);
  produce.chainStorage.resolve(
    // @ts-expect-error
    makeStorageWrapper(makeMockChainStorageRoot(), childrenNodes),
  );
  produce.board.resolve(makeFakeBoard());

  const { zoe, feeMintAccess, run } = t.context;
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  const { agoricNames, agoricNamesAdmin, spaces } =
    await makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  const { brand, issuer } = spaces;
  brand.produce.IST.resolve(run.brand);
  issuer.produce.IST.resolve(run.issuer);
  // @ts-expect-error
  produce.childrenNodes.resolve(childrenNodes);

  return { produce, consume, modules: { utils: { ...utils } }, ...spaces };
};

/**
 * @typedef {Record<string, any> & {
 *   aeth: IssuerKit & import('@agoric/zoe/tools/test-utils.js').AmountUtils;
 *   run: IssuerKit & import('@agoric/zoe/tools/test-utils.js').AmountUtils;
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
 * @param {import('ava').ExecutionContext<Context>} t
 * @param {IssuerKit<'nat'>} run
 * @param {IssuerKit<'nat'>} aeth
 * @param {NatValue[] | Ratio} priceOrList
 * @param {RelativeTime} quoteInterval
 * @param {Amount | undefined} unitAmountIn
 * @param {Partial<import('../../src/auction/params.js').AuctionParams>} actionParamArgs
 * @param {{
 *       btc: any;
 *       btcPrice: Ratio;
 *       btcAmountIn: any;
 *     }
 *   | undefined} extraAssetKit
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
  extraAssetKit = undefined,
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
  const quoteIssuerKit = makeIssuerKit('quote', AssetKind.SET);

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

  let abtcTestPriceAuthority;
  if (extraAssetKit) {
    abtcTestPriceAuthority = Array.isArray(extraAssetKit.btcPrice)
      ? makeScriptedPriceAuthority({
          actualBrandIn: extraAssetKit.btc.brand,
          actualBrandOut: run.brand,
          priceList: extraAssetKit.btcPrice,
          timer,
          quoteMint: quoteIssuerKit.mint,
          unitAmountIn: extraAssetKit.btcAmountIn,
          quoteInterval,
        })
      : makeManualPriceAuthority({
          actualBrandIn: extraAssetKit.btc.brand,
          actualBrandOut: run.brand,
          initialPrice: extraAssetKit.btcPrice,
          timer,
          quoteIssuerKit,
        });
  }

  const baggage = makeScalarBigMapStore('baggage');
  const { priceAuthority: priceAuthorityReg, adminFacet: priceAuthorityAdmin } =
    providePriceAuthorityRegistry(baggage);
  await E(priceAuthorityAdmin).registerPriceAuthority(
    aethTestPriceAuthority,
    aeth.brand,
    run.brand,
  );

  if (extraAssetKit && abtcTestPriceAuthority) {
    await E(priceAuthorityAdmin).registerPriceAuthority(
      abtcTestPriceAuthority,
      extraAssetKit.btc.brand,
      run.brand,
    );
  }

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
    abtcTestPriceAuthority,
  };
};
