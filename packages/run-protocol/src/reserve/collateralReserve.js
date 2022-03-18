// @ts-check

import { E, Far } from '@endo/far';
import { makeStore, keyEQ } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, handleParamGovernance } from '@agoric/governance';
import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';

import { AMM_INSTANCE_KEY, makeParamManager } from './params.js';

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
      [AMM_INSTANCE_KEY]: ammInstance,
    },
  } = zcf.getTerms();

  // we need a keyword for each issuer, but issuers don't have unique names. The
  // first brand with any alleged name gets that as its keyword. Others get a
  // modified version. The names aren't visible to users.
  const keywordForBrand = makeStore('keywords');
  const brandForKeyword = makeStore('brands');
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

  const getKeywordsForBrand = brand => {
    assert(
      keywordForBrand.has(brand),
      `Please call addIssuer for brand ${brand}`,
    );
    return keywordForBrand.get(brand);
  };

  const { initialPoserInvitation, feeMintAccess } = privateArgs;

  /** a powerful object; can modify the invitation */
  const paramManager = await makeParamManager(
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
    X`electorate amount (${electorateParam.value} didn't match ${electorateInvAmt}`,
  );

  // const brandToKeyword = makeStore('keyword');
  // should liquidiity tokens go in a separate seat?
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();
  const getAllocations = () => {
    return collateralSeat.getCurrentAllocation();
  };

  // Anyone can deposit collateral to the reserve.
  const addCollateralHook = async seat => {
    const {
      give: { Collateral: amountIn },
    } = seat.getProposal();

    const keyword = getKeywordsForBrand(amountIn.brand);
    seat.decrementBy(harden({ Collateral: amountIn }));
    collateralSeat.incrementBy(harden({ [keyword]: amountIn }));

    zcf.reallocate(collateralSeat, seat);
    seat.exit();

    return 'added Collateral to the Reserve';
  };

  const makeAddCollateralInvitation = () =>
    zcf.makeInvitation(addCollateralHook, 'Add Collateal');

  /** @type {ZCFMint} */
  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);

  const addLiquidityToAmmPool = async (collateralAmount, runAmount) => {
    // verify we have the funds
    const keyword = getKeywordsForBrand(collateralAmount.brand);
    if (
      !AmountMath.isGTE(
        collateralSeat.getCurrentAllocation()[keyword],
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
          [keyword]: collateralAmount,
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
      [keyword]: 'Secondary',
    });

    const [_, liqBrand] = brandForKeyword.get(keyword);
    const proposal = harden({
      give: {
        Central: runAmount,
        Secondary: collateralAmount,
      },
      want: { Liquidity: AmountMath.makeEmpty(liqBrand) },
    });

    await E.get(offerTo(zcf, invitation, mapping, proposal, offerToSeat))
      .deposited;

    // transfer from userSeat to LiquidityToken holdings
    const liquidityAmount = offerToSeat.getCurrentAllocation();
    const liquidityKeyword = makeLiquidityKeyword(keyword);

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

  const governedApis = Far('governed APIs', {
    addLiquidityToAmmPool,
  });

  const creatorFacet = wrapCreatorFacet(
    Far('collateral reserve creator', {
      makeAddCollateralInvitation,
      // TODO: makeRedeemLiquidityTokensInvitation,
      getAllocations,
      addIssuer,
      getGovernedApis: () => governedApis,
    }),
  );

  /** @typedef {typeof creatorFacet} ReserveCreatorFacet */
  const publicFacet = wrapPublicFacet(
    Far('Collateal Reserve public', {
      makeAddCollateralInvitation,
      // getAllocations,  perhaps this can't be public without a fee?
    }),
  );

  /** @typedef {typeof publicFacet} ReservePublicFacet */
  return harden({ creatorFacet, publicFacet });
};

harden(start);

export { start };

/** @typedef {Awaited<ReturnType<typeof start>>['publicFacet']} CollateralReservePublicFacet */
/** @typedef {Awaited<ReturnType<typeof start>>['creatorFacet']} CollateralReserveCreatorFacet */
