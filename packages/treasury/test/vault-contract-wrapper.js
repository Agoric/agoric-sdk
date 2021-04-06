// @ts-nocheck

import '@agoric/zoe/src/types';

import { makeIssuerKit, MathKind, amountMath } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { Far } from '@agoric/marshal';

import { makeVaultKit } from '../src/vault';
import { paymentFromZCFMint } from '../src/burn';
import { SECONDS_PER_YEAR } from '../src/interest';

const BASIS_POINTS = 10000n;

/** @param {ContractFacet} zcf */
export async function start(zcf) {
  console.log(`contract started`);

  const collateralKit = makeIssuerKit('Collateral');
  const { brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  const runMint = await zcf.makeZCFMint('RUN');
  const { brand: runBrand } = runMint.getIssuerRecord();

  const { zcfSeat: _collateralSt, userSeat: liqSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: stableCoinSeat } = zcf.makeEmptySeatKit();

  /** @type {MultipoolAutoswapPublicFacet} */
  const autoswapMock = {
    getInputPrice(amountIn, brandOut) {
      assert.equal(brandOut, runBrand);
      return amountMath.make(4n * amountIn.value, runBrand);
    },
  };

  function stageReward(amount, _fromSeat) {
    const priorReward = stableCoinSeat.getAmountAllocated('RUN', runBrand);
    return stableCoinSeat.stage({
      RUN: amountMath.add(priorReward, amount),
    });
  }

  /** @type {InnerVaultManager} */
  const managerMock = {
    getLiquidationMargin() {
      return makeRatio(105n, runBrand);
    },
    getInitialMargin() {
      return makeRatio(150n, runBrand);
    },
    getLoanFee() {
      return makeRatio(500n, runBrand, BASIS_POINTS);
    },
    getInterestRate() {
      return makeRatio((200n * SECONDS_PER_YEAR), runBrand, 3n * BASIS_POINTS);
    },
    collateralBrand,
    stageReward,
  };

  const timer = buildManualTimer(console.log);
  const options = {
    actualBrandIn: collateralBrand,
    actualBrandOut: runBrand,
    priceList: [80],
    tradeList: undefined,
    timer: buildManualTimer(console.log),
    quoteMint: makeIssuerKit('quote', MathKind.SET).mint,
  };
  const priceAuthority = makeFakePriceAuthority(options);

  const { vault, openLoan, accrueInterestAndAddToPool } = await makeVaultKit(
    zcf,
    managerMock,
    runMint,
    autoswapMock,
    priceAuthority,
    { chargingPeriod: 3n, recordingPeriod: 9n },
    timer.getCurrentTimestamp(),
  );

  zcf.setTestJig(() => ({ collateralKit, runMint, vault, timer }));

  async function makeHook(seat) {
    const { notifier, collateralPayoutP } = await openLoan(seat);

    return {
      vault,
      liquidationPayout: E(liqSeat).getPayout('Collateral'),
      runMint,
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
    mintRun(amount) {
      return paymentFromZCFMint(zcf, runMint, amount);
    },
  });

  const testInvitation = zcf.makeInvitation(makeHook, 'foo');
  return harden({ creatorInvitation: testInvitation, creatorFacet: vaultAPI });
}
