// @ts-nocheck

import '@agoric/zoe/src/types';

import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { Far } from '@agoric/marshal';

import { makeVaultKit } from '../src/vault';
import { paymentFromZCFMint } from '../src/burn';

const BASIS_POINTS = 10000n;

/** @param {ContractFacet} zcf */
export async function start(zcf) {
  console.log(`contract started`);

  const collateralKit = makeIssuerKit('Collateral');
  const { brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  const sconeMint = await zcf.makeZCFMint('Scones');
  const {
    issuer: _sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeMint.getIssuerRecord();

  const { zcfSeat: _collateralSt, userSeat: liqSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: stableCoinSeat } = zcf.makeEmptySeatKit();

  /** @type {MultipoolAutoswapPublicFacet} */
  const autoswapMock = {
    getInputPrice(amountIn, brandOut) {
      assert.equal(brandOut, sconeBrand);
      return sconeMath.make(4n * amountIn.value);
    },
  };

  function stageReward(amount, _fromSeat) {
    const priorReward = stableCoinSeat.getAmountAllocated('Scones', sconeBrand);
    return stableCoinSeat.stage({ Scones: sconeMath.add(priorReward, amount) });
  }

  /** @type {InnerVaultManager} */
  const managerMock = {
    getLiquidationMargin() {
      return makeRatio(105n, sconeBrand);
    },
    getInitialMargin() {
      return makeRatio(150n, sconeBrand);
    },
    getLoanFee() {
      return makeRatio(500n, sconeBrand, BASIS_POINTS);
    },
    getInterestRate() {
      return makeRatio(200, sconeBrand, BASIS_POINTS);
    },
    collateralBrand,
    stageReward,
  };

  const timer = buildManualTimer(console.log);
  const options = {
    actualBrandIn: collateralBrand,
    actualBrandOut: sconeBrand,
    priceList: [80],
    tradeList: undefined,
    timer: buildManualTimer(console.log),
    quoteMint: makeIssuerKit('quote', MathKind.SET).mint,
  };
  const priceAuthority = makeFakePriceAuthority(options);

  const { vault, openLoan, accrueInterestAndAddToPool } = await makeVaultKit(
    zcf,
    managerMock,
    sconeMint,
    autoswapMock,
    priceAuthority,
    { chargingPeriod: 3n, recordingPeriod: 9n },
    timer.getCurrentTimestamp(),
  );

  zcf.setTestJig(() => ({ collateralKit, sconeMint, vault, timer }));

  async function makeHook(seat) {
    const { notifier, collateralPayoutP } = await openLoan(seat);

    return {
      vault,
      liquidationPayout: E(liqSeat).getPayout('Collateral'),
      sconeMint,
      collateralKit,
      actions: {
        add() {
          return vault.makeAdjustBalancesInvitation();
        },
        accrueInterestAndAddToPool,
      },
      notifier,
      collateralPayoutP,
    };
  }

  console.log(`makeContract returning`);

  const vaultAPI = Far('vaultAPI', {
    makeAdjustBalancesInvitation() {
      return vault.makeAdjustBalancesInvitation();
    },
    mintScones(amount) {
      return paymentFromZCFMint(zcf, sconeMint, amount);
    },
  });

  const testInvitation = zcf.makeInvitation(makeHook, 'foo');
  return harden({ creatorInvitation: testInvitation, creatorFacet: vaultAPI });
}
