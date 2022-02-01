// @ts-nocheck

import '@agoric/zoe/src/types.js';

import { makeIssuerKit, AssetKind } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';

import { makeVaultKit } from '../../src/vaultFactory/vault.js';
import { paymentFromZCFMint } from '../../src/vaultFactory/burn.js';

const BASIS_POINTS = 10000n;
const SECONDS_PER_HOUR = 60n * 60n;

/** @type {ContractStartFn} */
export async function start(zcf, privateArgs) {
  console.log(`contract started`);
  assert.typeof(privateArgs.feeMintAccess, 'object');

  const collateralKit = makeIssuerKit('Collateral');
  const { brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  const runMint = await zcf.registerFeeMint('RUN', privateArgs.feeMintAccess);
  const { brand: runBrand } = runMint.getIssuerRecord();

  const { zcfSeat: vaultFactorySeat } = zcf.makeEmptySeatKit();

  function reallocateReward(amount, fromSeat, otherSeat) {
    vaultFactorySeat.incrementBy(
      fromSeat.decrementBy(
        harden({
          RUN: amount,
        }),
      ),
    );
    if (otherSeat !== undefined) {
      zcf.reallocate(vaultFactorySeat, fromSeat, otherSeat);
    } else {
      zcf.reallocate(vaultFactorySeat, fromSeat);
    }
  }

  /** @type {InnerVaultManager} */
  const managerMock = Far('vault manager mock', {
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
      return makeRatio(5n, runBrand);
    },
    getCollateralBrand() {
      return collateralBrand;
    },
    getChargingPeriod() {
      return SECONDS_PER_HOUR * 24n;
    },
    getRecordingPeriod() {
      return SECONDS_PER_HOUR * 24n * 7n;
    },
    reallocateReward,
  });

  const timer = buildManualTimer(console.log, 0n, SECONDS_PER_HOUR * 24n);
  const options = {
    actualBrandIn: collateralBrand,
    actualBrandOut: runBrand,
    priceList: [80],
    tradeList: undefined,
    timer,
    quoteMint: makeIssuerKit('quote', AssetKind.SET).mint,
  };
  const priceAuthority = makeFakePriceAuthority(options);

  const { vault, openLoan, accrueInterestAndAddToPool } = await makeVaultKit(
    zcf,
    managerMock,
    runMint,
    priceAuthority,
    timer.getCurrentTimestamp(),
  );

  zcf.setTestJig(() => ({ collateralKit, runMint, vault, timer }));

  async function makeHook(seat) {
    const { notifier } = await openLoan(seat);

    return {
      vault,
      runMint,
      collateralKit,
      actions: Far('vault actions', {
        add() {
          return vault.makeAdjustBalancesInvitation();
        },
        accrueInterestAndAddToPool,
      }),
      notifier,
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
