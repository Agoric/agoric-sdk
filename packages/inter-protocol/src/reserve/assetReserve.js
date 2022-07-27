// @ts-check

import { E, Far } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import { handleParamGovernance, ParamTypes } from '@agoric/governance';
import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';
import { provideDurableMapStore, vivifyKindMulti } from '@agoric/vat-data';

import { AMM_INSTANCE } from './params.js';
import { makeTracer } from '../makeTracer.js';
import { makeMetricsPublisherKit } from '../contractSupport.js';

const { details: X, quote: q } = assert;

const trace = makeTracer('Reserve', false);

const makeLiquidityKeyword = keyword => `${keyword}Liquidity`;

const RunKW = 'RUN';

const nonalphanumeric = /[^A-Za-z0-9]/g;

/**
 * @typedef {object} MetricsNotification
 *
 * @property {AmountKeywordRecord} allocations
 * @property {Amount<'nat'>} shortfallBalance shortfall from liquiditation that
 * @property {Amount<'nat'>} totalFeeMinted total RUN minted to date
 * @property {Amount<'nat'>} totalFeeBurned total RUN burned to date
 *   has not yet been compensated.
 */

/**
 * @typedef {{
 *   increaseLiquidationShortfall: (increase: Amount) => void
 *   reduceLiquidationShortfall: (reduction: Amount) => void
 * }} ShortfallReportingFacet
 */

/**
 * @typedef {{
 *   state: {},
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
 * dispense it for various purposes under governance control. It currently
 * supports governance decisions to add liquidity to an AMM pool.
 *
 * This contract has the ability to mint RUN. When adding liquidity to an AMM
 * pool, it takes a specified amount of collateral on hand, and mints new RUN to
 * accompany it, and deposits both into an AMM pool, using the AMM's method that
 * allows the pool balance to be determined based on the contributed funds.
 *
 * @param {ZCF<GovernanceTerms<{AmmInstance: 'instance'}> &
 * {
 *   governedApis: ['addLiquidityToAmmPool'],
 * }
 * >} zcf
 * @param {{
 *   feeMintAccess: FeeMintAccess,
 *   initialPoserInvitation: Payment,
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
   * Used to look up the unique keyword for each brand, including RUN.
   *
   * @type {MapStore<Brand, Keyword>}
   */
  const keywordForBrand = provideDurableMapStore(baggage, 'keywordForBrand');
  /**
   * Used to look up the brands for keywords, excluding RUN because it's a special case.
   *
   * @type {MapStore<Keyword, Brand>}
   */
  const brandForKeyword = provideDurableMapStore(baggage, 'brandForKeyword');
  /**
   * @type {MapStore<Brand, Brand>}
   */
  const liquidityBrandForBrand = provideDurableMapStore(
    baggage,
    'liquidityBrandForBrand',
  );

  const takeFeeMint = async () => {
    if (baggage.has('runMint')) {
      return baggage.get('runMint');
    }

    const runMintTemp = await zcf.registerFeeMint(
      RunKW,
      privateArgs.feeMintAccess,
    );
    baggage.init('runMint', runMintTemp);
    return runMintTemp;
  };
  /** @type {ZCFMint} */
  const runMint = await takeFeeMint();
  const runKit = runMint.getIssuerRecord();
  const emptyAmount = AmountMath.makeEmpty(runKit.brand);

  /**
   * @param {Brand} brand
   * @param {Keyword} keyword
   */
  const saveBrandKeyword = (brand, keyword) => {
    keywordForBrand.init(brand, keyword);
    brandForKeyword.init(keyword, brand);
  };

  saveBrandKeyword(runKit.brand, RunKW);
  // no need to saveIssuer() b/c registerFeeMint did it

  const { augmentVirtualPublicFacet, makeVirtualGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      privateArgs.initialPoserInvitation,
      {
        [AMM_INSTANCE]: ParamTypes.INSTANCE,
      },
      privateArgs.storageNode,
      privateArgs.marshaller,
    );

  /** @type {Promise<XYKAMMPublicFacet>} */
  const ammPublicFacet = E(zcf.getZoeService()).getPublicFacet(
    params.getAmmInstance(),
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
      keyword !== RunKW && brand !== runKit.brand,
      X`${q(RunKW)} is a special case handled by the reserve contract`,
    );

    trace('addIssuer storing', {
      keyword,
      brand,
    });

    saveBrandKeyword(brand, keyword);
    await zcf.saveIssuer(issuer, keyword);
  };

  /**
   * @param {MethodContext} _context
   * @param {Issuer} baseIssuer on which the liquidity issuer is based
   */
  const addLiquidityIssuer = async (_context, baseIssuer) => {
    const getBrand = () => {
      try {
        return zcf.getBrandForIssuer(baseIssuer);
      } catch {
        assert.fail(
          `baseIssuer ${baseIssuer} not known; try addIssuer() first`,
        );
      }
    };
    const baseBrand = getBrand();
    const baseKeyword = keywordForBrand.get(baseBrand);
    const liquidityIssuer = E(ammPublicFacet).getLiquidityIssuer(baseBrand);
    const liquidityBrand = await E(liquidityIssuer).getBrand();
    const liquidityKeyword = makeLiquidityKeyword(baseKeyword);

    trace('addLiquidityIssuer', {
      baseBrand,
      baseKeyword,
      liquidityBrand,
      liquidityKeyword,
    });
    saveBrandKeyword(liquidityBrand, liquidityKeyword);
    liquidityBrandForBrand.init(baseBrand, liquidityBrand);

    await zcf.saveIssuer(liquidityIssuer, liquidityKeyword);
  };

  const conjureKeyword = async baseBrand => {
    const allegedName = await E(baseBrand).getAllegedName();
    const safeName = allegedName.replace(nonalphanumeric, '');
    let keyword;
    let keywordNum = 0;
    do {
      // 'R' to guarantee leading uppercase
      keyword = `R${safeName}${keywordNum || ''}`;
      keywordNum += 1;
    } while (brandForKeyword.has(keyword));
    return keyword;
  };

  /**
   * @param {MethodContext} context
   * @param {Brand} ammSecondaryBrand
   */
  const addIssuerFromAmm = async (context, ammSecondaryBrand) => {
    assert(
      ammSecondaryBrand !== runKit.brand,
      X`${q(RunKW)} is a special case handled by the reserve contract`,
    );

    const keyword = await conjureKeyword(ammSecondaryBrand);
    trace('addIssuerFromAmm', { ammSecondaryBrand, keyword });
    // validate the AMM has this brand and match its issuer
    const issuer = await E(ammPublicFacet).getSecondaryIssuer(
      ammSecondaryBrand,
    );
    await addIssuer(context, issuer, keyword);
  };

  const getKeywordForBrand = brand => {
    assert(
      keywordForBrand.has(brand),
      X`Issuer not defined for brand ${q(brand)}; first call addIssuer()`,
    );
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
    seat.decrementBy(harden({ Collateral: amountIn }));
    collateralSeat.incrementBy(harden({ [collateralKeyword]: amountIn }));

    zcf.reallocate(collateralSeat, seat);
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

  // Takes collateral from the reserve, mints RUN to accompany it, and uses both
  // to add Liquidity to a pool in the AMM.
  const addLiquidityToAmmPool = async (
    { state },
    collateralAmount,
    runAmount,
  ) => {
    // verify we have the funds
    const collateralKeyword = getKeywordForBrand(collateralAmount.brand);
    if (
      !AmountMath.isGTE(
        collateralSeat.getCurrentAllocation()[collateralKeyword],
        collateralAmount,
      )
    ) {
      throw new Error('insufficient reserves for that transaction');
    }

    // create the RUN
    const offerToSeat = runMint.mintGains(harden({ RUN: runAmount }));
    state.totalFeeMinted = AmountMath.add(state.totalFeeMinted, runAmount);

    offerToSeat.incrementBy(
      collateralSeat.decrementBy(
        harden({
          [collateralKeyword]: collateralAmount,
        }),
      ),
    );
    zcf.reallocate(collateralSeat, offerToSeat);

    // Add RUN and collateral to the AMM
    const invitation = await E(
      ammPublicFacet,
    ).makeAddLiquidityAtRateInvitation();
    const mapping = harden({
      RUN: 'Central',
      [collateralKeyword]: 'Secondary',
    });

    const liqBrand = liquidityBrandForBrand.get(collateralAmount.brand);
    const proposal = harden({
      give: {
        Central: runAmount,
        Secondary: collateralAmount,
      },
      want: { Liquidity: AmountMath.makeEmpty(liqBrand) },
    });

    // chain await the completion of both the offer and the `deposited` promise
    await E.get(offerTo(zcf, invitation, mapping, proposal, offerToSeat))
      .deposited;

    // transfer from userSeat to LiquidityToken holdings
    const liquidityAmount = offerToSeat.getCurrentAllocation();
    const liquidityKeyword = makeLiquidityKeyword(collateralKeyword);

    offerToSeat.decrementBy(
      harden({
        Liquidity: liquidityAmount.Liquidity,
      }),
    );
    collateralSeat.incrementBy(
      harden({
        [liquidityKeyword]: liquidityAmount.Liquidity,
      }),
    );
    zcf.reallocate(offerToSeat, collateralSeat);
    updateMetrics({ state });
  };

  const burnRUNToReduceShortfall = ({ state }, reduction) => {
    reduction = AmountMath.coerce(runKit.brand, reduction);
    const runKeyword = keywordForBrand.get(runKit.brand);
    const runBalance = collateralSeat.getAmountAllocated(runKeyword);
    const amountToBurn = AmountMath.min(reduction, runBalance);
    if (AmountMath.isEmpty(amountToBurn)) {
      return;
    }

    runMint.burnLosses(harden({ [runKeyword]: amountToBurn }), collateralSeat);
    state.totalFeeBurned = AmountMath.add(state.totalFeeBurned, amountToBurn);
    updateMetrics({ state });
  };

  const shortfallReportingFacet = {
    increaseLiquidationShortfall,
    // currently exposed for testing. Maybe it only gets called internally?
    reduceLiquidationShortfall,
  };

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

  const governedApis = { addLiquidityToAmmPool, burnRUNToReduceShortfall };

  const publicFacet = augmentVirtualPublicFacet(
    Far('Collateral Reserve public', {
      makeAddCollateralInvitation,
      addIssuerFromAmm,
      addLiquidityIssuer,
    }),
  );

  const makeAssetReserve = vivifyKindMulti(baggage, 'assetReserve', init, {
    publicFacet,
    creatorFacet: governorFacet,
    shortfallReportingFacet,
    limitedCreatorFacet,
    governedApis,
  });

  const { creatorFacet, publicFacet: pFacet } = makeAssetReserve();
  return harden({ creatorFacet, publicFacet: pFacet });
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
 * @property {(issuer: Issuer) => void} addIssuer
 * @property {() => Invitation} makeShortfallReportingInvitation
 * @property {() => MetricsNotification} getMetrics
 */

/**
 * @typedef {object} OriginalAssetReservePublicFacet
 * @property {() => Invitation} makeAddCollateralInvitation
 * @property {(brand: Brand) => void} addIssuerFromAmm
 * @property {(issuer: Issuer) => void} addLiquidityIssuer
 */

/** @typedef {Awaited<ReturnType<typeof start>>['publicFacet']} AssetReservePublicFacet */
/** @typedef {Awaited<ReturnType<typeof start>>['creatorFacet']} AssetReserveCreatorFacet the creator facet for the governor */
/** @typedef {LimitedCreatorFacet<OriginalAssetReserveCreatorFacet>} AssetReserveLimitedCreatorFacet */
/** @typedef {GovernedContractFacetAccess<AssetReservePublicFacet,AssetReserveLimitedCreatorFacet>} GovernedAssetReserveFacetAccess */
