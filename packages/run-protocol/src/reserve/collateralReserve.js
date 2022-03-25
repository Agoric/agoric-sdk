// @ts-check

import { E, Far } from '@endo/far';
import { makeStore, keyEQ } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, handleParamGovernance } from '@agoric/governance';
import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';

import { AMM_INSTANCE, makeReserveParamManager } from './params.js';

const { details: X } = assert;

const makeLiquidityKeyword = keyword => `${keyword}Liquidity`;

/**
 * Collateral Reserve holds onto Collateral for the RUN protocol, and can
 * dispense it for various purposes under governance control. It currently
 * supports governance decisions to add liquidity to an AMM pool.
 *
 * This contract has the ability to mint RUN. When adding liquidity to an AMM
 * pool, it takes a specified amount of collateral on hand, and mints new RUN to
 * accompany it, and deposits both into an AMM pool, using the AMM's method that
 * allows the pool balance to be determined based on the contributed funds.
 *
 * @param {ZCF<
 * {
 *   electionManager: VoteOnParamChange,
 *   main: {
 *     AmmInstance: ParamRecord<'instance'>,
 *     Electorate: ParamRecord<'invitation'>,
 *   },
 *   governedApis: ['addLiquidityToAmmPool'],
 * }
 * >} zcf
 * @param {{feeMintAccess: FeeMintAccess, initialPoserInvitation: Payment}} privateArgs
 */
const start = async (zcf, privateArgs) => {
  const {
    main: {
      [CONTRACT_ELECTORATE]: electorateParam,
      [AMM_INSTANCE]: ammInstance,
    },
  } = zcf.getTerms();

  /** @type {MapStore<Brand, Keyword>} */
  const keywordForBrand = makeStore('keywords');
  /** @type {MapStore<Keyword, [Brand, Brand]>} */
  const brandForKeyword = makeStore('brands');

  /** @type {Promise<XYKAMMPublicFacet>} */
  const ammPublicFacet = E(zcf.getZoeService()).getPublicFacet(
    ammInstance.value,
  );

  const addIssuer = async (issuer, keyword) => {
    const brand = await E(issuer).getBrand();

    const liquidityIssuer = E(ammPublicFacet).getLiquidityIssuer(brand);
    const liquidityBrand = await E(liquidityIssuer).getBrand();

    brandForKeyword.init(keyword, [brand, liquidityBrand]);
    keywordForBrand.init(brand, keyword);
    return Promise.all([
      zcf.saveIssuer(issuer, keyword),
      zcf.saveIssuer(liquidityIssuer, makeLiquidityKeyword(keyword)),
    ]);
  };

  const getKeywordForBrand = brand => {
    assert(
      keywordForBrand.has(brand),
      `Issuer not defined for brand ${brand}; first call addIssuer()`,
    );
    return keywordForBrand.get(brand);
  };

  const { initialPoserInvitation, feeMintAccess } = privateArgs;

  /** a powerful object; can modify the invitation */
  const paramManager = await makeReserveParamManager(
    zcf.getZoeService(),
    ammInstance.value,
    initialPoserInvitation,
  );

  const { wrapPublicFacet, wrapCreatorFacet, getElectorate } =
    handleParamGovernance(zcf, paramManager);

  const electorateInvAmt = getElectorate();
  // compare invitation amount from privateArgs with electorateParam from terms
  assert(
    keyEQ(electorateInvAmt, electorateParam.value),
    X`invitation (${electorateParam.value} didn't match ${electorateInvAmt}`,
  );

  // We keep the associated liquidity tokens in the same seat
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();
  const getAllocations = () => {
    return collateralSeat.getCurrentAllocation();
  };

  // Anyone can deposit collateral to the reserve.
  const addCollateralHook = async seat => {
    const {
      give: { Collateral: amountIn },
    } = seat.getProposal();

    const collateralKeyword = getKeywordForBrand(amountIn.brand);
    seat.decrementBy(harden({ Collateral: amountIn }));
    collateralSeat.incrementBy(harden({ [collateralKeyword]: amountIn }));

    zcf.reallocate(collateralSeat, seat);
    seat.exit();

    return 'added Collateral to the Reserve';
  };

  const makeAddCollateralInvitation = () =>
    zcf.makeInvitation(addCollateralHook, 'Add Collateal');

  /** @type {ZCFMint} */
  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);

  // Takes collateral from the reserve, mints RUN to accompany it, and uses both
  // to add Liquidity to a pool in the AMM.
  const addLiquidityToAmmPool = async (collateralAmount, runAmount) => {
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

    const [_, liqBrand] = brandForKeyword.get(collateralKeyword);
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
  };

  const creatorFacet = wrapCreatorFacet(
    {
      makeAddCollateralInvitation,
      // add makeRedeemLiquidityTokensInvitation later. For now just store them
      getAllocations,
      addIssuer,
    },
    { addLiquidityToAmmPool },
  );

  /** @typedef {typeof creatorFacet} ReserveCreatorFacet */
  const publicFacet = wrapPublicFacet(
    Far('Collateral Reserve public', {
      makeAddCollateralInvitation,
    }),
  );

  /** @typedef {typeof publicFacet} ReservePublicFacet */
  return harden({ creatorFacet, publicFacet });
};

harden(start);

export { start };

/** @typedef {Awaited<ReturnType<typeof start>>['publicFacet']} CollateralReservePublicFacet */
/** @typedef {Awaited<ReturnType<typeof start>>['creatorFacet']} CollateralReserveCreatorFacet */
