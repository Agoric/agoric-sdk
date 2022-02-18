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
export const start = async (zcf, privateArgs) => {
  console.log(`contract started`);
  assert.typeof(privateArgs.feeMintAccess, 'object');

  const collateralKit = makeIssuerKit('Collateral');
  const { brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  const runMint = await zcf.registerFeeMint('RUN', privateArgs.feeMintAccess);
  const { brand: runBrand } = runMint.getIssuerRecord();

  const { zcfSeat: vaultFactorySeat } = zcf.makeEmptySeatKit();

  const reallocateReward = (amount, fromSeat, otherSeat) => {
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
  };

  /** @type {InnerVaultManager} */
  const managerMock = Far('vault manager mock', {
    getLiquidationMargin: () => makeRatio(105n, runBrand),
    getLoanFee: () => makeRatio(500n, runBrand, BASIS_POINTS),
    getInterestRate: () => makeRatio(5n, runBrand),
    getCollateralBrand: () => collateralBrand,
    getChargingPeriod: () => SECONDS_PER_HOUR * 24n,
    getRecordingPeriod: () => SECONDS_PER_HOUR * 24n * 7n,
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

  const makeHook = async seat => {
    const { notifier } = await openLoan(seat);

    return {
      vault,
      runMint,
      collateralKit,
      actions: Far('vault actions', {
        add: () => vault.makeAdjustBalancesInvitation(),
        accrueInterestAndAddToPool,
      }),
      notifier,
    };
  };

  console.log(`makeContract returning`);

  const vaultAPI = Far('vaultAPI', {
    makeAdjustBalancesInvitation: () => vault.makeAdjustBalancesInvitation(),
    mintRun: amount => paymentFromZCFMint(zcf, runMint, amount),
  });

  const testInvitation = zcf.makeInvitation(makeHook, 'foo');
  return harden({ creatorInvitation: testInvitation, creatorFacet: vaultAPI });
};
