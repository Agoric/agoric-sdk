import { E, Far } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { atomicTransfer } from '@agoric/zoe/src/contractSupport/index.js';
import { provideDurableMapStore, prepareKindMulti } from '@agoric/vat-data';

import { makeTracer } from '@agoric/internal';
import { makeMetricsPublisherKit } from '../contractSupport.js';

const { Fail, quote: q } = assert;

const trace = makeTracer('Reserve', false);

/**
 * @typedef {object} MetricsNotification
 *
 * @property {AmountKeywordRecord} allocations
 * @property {Amount<'nat'>} shortfallBalance shortfall from liquidation that
 *   has not yet been compensated.
 * @property {Amount<'nat'>} totalFeeMinted total Fee tokens minted to date
 * @property {Amount<'nat'>} totalFeeBurned total Fee tokens burned to date
 */

/**
 * @typedef {{
 *   increaseLiquidationShortfall: (increase: Amount) => void
 *   reduceLiquidationShortfall: (reduction: Amount) => void
 * }} ShortfallReportingFacet
 */

/**
 * @typedef {{
 *   state: {
 *     totalFeeBurned: Amount<'nat'>,
 *     totalFeeMinted: Amount<'nat'>,
 *   },
 *   facets: {
 *     publicFacet: {},
 *     creatorFacet: {},
 *     shortfallReportingFacet: ShortfallReportingFacet,
 *     limitedCreatorFacet: {},
 *     governedApis: {},
 *      },
 * }} MethodContext
 */

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * Asset Reserve holds onto assets for the Inter Protocol, and can
 * dispense it for various purposes under governance control.
 *
 * @param {ZCF<GovernanceTerms<{}> &
 * {
 *   governedApis: ['burnFeesToReduceShortfall'],
 * }
 * >} zcf
 * @param {{
 *   feeMintAccess: FeeMintAccess,
 *   initialPoserInvitation: Invitation,
 *   marshaller: ERef<Marshaller>,
 *   storageNode: ERef<StorageNode>,
 * }} privateArgs
 * @param {Baggage} baggage
 */
const start = async (zcf, privateArgs, baggage) => {
  // This contract mixes two styles of access to durable state. durableStores
  // are declared at the top level and referenced lexically. local state is
  // accessed via the `state` object. The latter means updates are made directly
  // to state and don't require reference to baggage.

  /**
   * Used to look up the unique keyword for each brand, including Fee brand.
   *
   * @type {MapStore<Brand, Keyword>}
   */
  const keywordForBrand = provideDurableMapStore(baggage, 'keywordForBrand');
  /**
   * Used to look up the brands for keywords, excluding Fee because it's a special case.
   *
   * @type {MapStore<Keyword, Brand>}
   */
  const brandForKeyword = provideDurableMapStore(baggage, 'brandForKeyword');

  /** @type {() => Promise<ZCFMint<'nat'>>} */
  const takeFeeMint = async () => {
    if (baggage.has('feeMint')) {
      return baggage.get('feeMint');
    }

    const feeMintTemp = await zcf.registerFeeMint(
      'Fee',
      privateArgs.feeMintAccess,
    );
    baggage.init('feeMint', feeMintTemp);
    return feeMintTemp;
  };
  const feeMint = await takeFeeMint();
  const feeKit = feeMint.getIssuerRecord();
  const emptyAmount = AmountMath.makeEmpty(feeKit.brand);

  /**
   * @param {Brand} brand
   * @param {Keyword} keyword
   */
  const saveBrandKeyword = (brand, keyword) => {
    keywordForBrand.init(brand, keyword);
    brandForKeyword.init(keyword, brand);
  };

  saveBrandKeyword(feeKit.brand, 'Fee');
  // no need to saveIssuer() b/c registerFeeMint did it

  const { augmentVirtualPublicFacet, makeVirtualGovernorFacet } =
    await handleParamGovernance(
      zcf,
      privateArgs.initialPoserInvitation,
      {},
      privateArgs.storageNode,
      privateArgs.marshaller,
    );

  /**
   * @param {MethodContext} _context
   * @param {Issuer} issuer
   * @param {string} keyword
   */
  const addIssuer = async (_context, issuer, keyword) => {
    const brand = await E(issuer).getBrand();
    trace('addIssuer', { brand, keyword });
    assert(
      keyword !== 'Fee' && brand !== feeKit.brand,
      `'Fee' brand is a special case handled by the reserve contract`,
    );

    trace('addIssuer storing', {
      keyword,
      brand,
    });

    saveBrandKeyword(brand, keyword);
    await zcf.saveIssuer(issuer, keyword);
  };

  const getKeywordForBrand = brand => {
    keywordForBrand.has(brand) ||
      Fail`Issuer not defined for brand ${q(brand)}; first call addIssuer()`;
    return keywordForBrand.get(brand);
  };

  // We keep the associated liquidity tokens in the same seat
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();
  const getAllocations = () => {
    return collateralSeat.getCurrentAllocation();
  };

  /**
   * Anyone can deposit any assets to the reserve
   *
   * @param {ZCFSeat} seat
   */
  const addCollateralHook = async seat => {
    const {
      give: { Collateral: amountIn },
    } = seat.getProposal();

    const collateralKeyword = getKeywordForBrand(amountIn.brand);

    atomicTransfer(
      zcf,
      seat,
      collateralSeat,
      { Collateral: amountIn },
      { [collateralKeyword]: amountIn },
    );
    seat.exit();

    trace('received collateral', amountIn);
    return 'added Collateral to the Reserve';
  };

  const makeAddCollateralInvitation = () =>
    zcf.makeInvitation(addCollateralHook, 'Add Collateral');

  /** @type {import('../contractSupport.js').MetricsPublisherKit<MetricsNotification>} */
  const { metricsPublication, metricsSubscription } = makeMetricsPublisherKit(
    privateArgs.storageNode,
    privateArgs.marshaller,
  );

  const updateMetrics = ({ state }) => {
    const metrics = harden({
      allocations: getAllocations(),
      shortfallBalance: state.shortfallBalance,
      totalFeeMinted: state.totalFeeMinted,
      totalFeeBurned: state.totalFeeBurned,
    });
    metricsPublication.updateState(metrics);
  };

  const increaseLiquidationShortfall = ({ state }, shortfall) => {
    state.shortfallBalance = AmountMath.add(state.shortfallBalance, shortfall);
    updateMetrics({ state });
  };

  const reduceLiquidationShortfall = ({ state }, reduction) => {
    if (AmountMath.isGTE(reduction, state.shortfallBalance)) {
      state.shortfallBalance = emptyAmount;
    } else {
      state.shortfallBalance = AmountMath.subtract(
        state.shortfallBalance,
        reduction,
      );
    }
    updateMetrics({ state });
  };

  const init = () => {
    const initialState = {
      totalFeeMinted: emptyAmount,
      totalFeeBurned: emptyAmount,
      shortfallBalance: emptyAmount,
    };
    updateMetrics({ state: initialState });
    return initialState;
  };

  /**
   *
   * @param {MethodContext} context
   * @param {Amount<'nat'>} reduction
   * @returns {void}
   */
  const burnFeesToReduceShortfall = ({ state }, reduction) => {
    trace('burnFeesToReduceShortfall', reduction);
    reduction = AmountMath.coerce(feeKit.brand, reduction);
    const feeKeyword = keywordForBrand.get(feeKit.brand);
    const feeBalance = collateralSeat.getAmountAllocated(feeKeyword);
    const amountToBurn = AmountMath.min(reduction, feeBalance);
    if (AmountMath.isEmpty(amountToBurn)) {
      return;
    }

    feeMint.burnLosses(harden({ [feeKeyword]: amountToBurn }), collateralSeat);
    state.totalFeeBurned = AmountMath.add(state.totalFeeBurned, amountToBurn);
    updateMetrics({ state });
  };

  const shortfallReportingFacet = {
    increaseLiquidationShortfall,
    // currently exposed for testing. Maybe it only gets called internally?
    reduceLiquidationShortfall,
  };

  /** @param {MethodContext} context */
  const makeShortfallReportingInvitation = ({ facets }) => {
    const handleShortfallReportingOffer = () => {
      return facets.shortfallReportingFacet;
    };

    return zcf.makeInvitation(
      handleShortfallReportingOffer,
      'getFacetForReportingShortfalls',
    );
  };

  const { governorFacet, limitedCreatorFacet } = makeVirtualGovernorFacet({
    makeAddCollateralInvitation,
    // add makeRedeemLiquidityTokensInvitation later. For now just store them
    getAllocations,
    addIssuer,
    makeShortfallReportingInvitation,
    getMetrics: () => metricsSubscription,
  });

  const governedApis = { burnFeesToReduceShortfall };

  const publicFacet = augmentVirtualPublicFacet(
    Far('Collateral Reserve public', {
      makeAddCollateralInvitation,
    }),
  );

  const makeAssetReserve = prepareKindMulti(baggage, 'assetReserve', init, {
    publicFacet,
    creatorFacet: governorFacet,
    shortfallReportingFacet,
    limitedCreatorFacet,
    governedApis,
  });

  const { creatorFacet, publicFacet: pFacet } = makeAssetReserve();
  return { creatorFacet, publicFacet: pFacet };
};

harden(start);

export { start };

/**
 * @typedef {object} ShortfallReporter
 * @property {(shortfall: Amount) => void} increaseLiquidationShortfall
 * @property {(shortfall: Amount) => void} reduceLiquidationShortfall
 */

/**
 * @typedef {object} OriginalAssetReserveCreatorFacet
 * @property {() => Invitation} makeAddCollateralInvitation
 * @property {() => Allocation} getAllocations
 * @property {(issuer: Issuer, kwd: string) => void} addIssuer
 * @property {() => Invitation<ShortfallReporter>} makeShortfallReportingInvitation
 * @property {() => StoredSubscription<MetricsNotification>} getMetrics
 */

/**
 * @typedef {object} OriginalAssetReservePublicFacet
 * @property {() => Invitation} makeAddCollateralInvitation
 * @property {(issuer: Issuer) => void} addLiquidityIssuer
 */

/** @typedef {Awaited<ReturnType<typeof start>>['publicFacet']} AssetReservePublicFacet */
/** @typedef {Awaited<ReturnType<typeof start>>['creatorFacet']} AssetReserveCreatorFacet the creator facet for the governor */
/** @typedef {LimitedCreatorFacet<OriginalAssetReserveCreatorFacet>} AssetReserveLimitedCreatorFacet */
/** @typedef {GovernedContractFacetAccess<AssetReservePublicFacet,AssetReserveLimitedCreatorFacet>} GovernedAssetReserveFacetAccess */
