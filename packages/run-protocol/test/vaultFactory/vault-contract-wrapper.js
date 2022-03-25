// @ts-check

import '@agoric/zoe/src/types.js';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority.js';
import {
  floorDivideBy,
  makeRatio,
  multiplyRatios,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';

import { makeNotifierKit } from '@agoric/notifier';
import { getAmountOut } from '@agoric/zoe/src/contractSupport';
import { E } from '@endo/eventual-send';
import { makeInnerVault } from '../../src/vaultFactory/vault.js';
import { paymentFromZCFMint } from '../../src/vaultFactory/burn.js';

const BASIS_POINTS = 10000n;
const SECONDS_PER_HOUR = 60n * 60n;
const DAY = SECONDS_PER_HOUR * 24n;

/**
 * @param {ZCF} zcf
 * @param {{feeMintAccess: FeeMintAccess}} privateArgs
 */
export async function start(zcf, privateArgs) {
  console.log(`contract started`);
  assert.typeof(privateArgs.feeMintAccess, 'object');

  const collateralKit = makeIssuerKit('Collateral');
  const { brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  const runMint = await zcf.registerFeeMint('RUN', privateArgs.feeMintAccess);
  const { brand: runBrand } = runMint.getIssuerRecord();

  const LIQUIDATION_MARGIN = makeRatio(105n, runBrand);

  const { zcfSeat: vaultFactorySeat } = zcf.makeEmptySeatKit();

  let vaultCounter = 0;

  let currentInterest = makeRatio(5n, runBrand); // 5%
  let compoundedInterest = makeRatio(100n, runBrand); // starts at 1.0, no interest

  const { zcfSeat: stage } = zcf.makeEmptySeatKit();

  const { notifier: managerNotifier } = makeNotifierKit();

  const timer = buildManualTimer(console.log, 0n, DAY);
  const options = {
    actualBrandIn: collateralBrand,
    actualBrandOut: runBrand,
    priceList: [80],
    tradeList: undefined,
    timer,
    quoteMint: makeIssuerKit('quote', AssetKind.SET).mint,
  };
  const priceAuthority = makeFakePriceAuthority(options);
  const maxDebtFor = async collateralAmount => {
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      runBrand,
    );
    // floorDivide because we want the debt ceiling lower
    return floorDivideBy(getAmountOut(quoteAmount), LIQUIDATION_MARGIN);
  };

  const reallocateWithFee = (fee, wanted, seat, ...otherSeats) => {
    const toMint = AmountMath.add(wanted, fee);
    runMint.mintGains(harden({ RUN: toMint }), stage);
    try {
      vaultFactorySeat.incrementBy(stage.decrementBy(harden({ RUN: fee })));
      seat.incrementBy(stage.decrementBy(harden({ RUN: wanted })));
      zcf.reallocate(vaultFactorySeat, stage, seat, ...otherSeats);
    } catch (e) {
      stage.clear();
      vaultFactorySeat.clear();
      runMint.burnLosses(harden({ RUN: toMint }), stage);
      throw e;
    } finally {
      assert(
        AmountMath.isEmpty(stage.getAmountAllocated('RUN', runBrand)),
        `Stage should be empty of RUN`,
      );
    }
  };

  const mintAndReallocate = (toMint, fee, seat, ...otherSeats) => {
    const wanted = AmountMath.subtract(toMint, fee);
    reallocateWithFee(fee, wanted, seat, ...otherSeats);
  };

  const burnAndRecord = (toBurn, seat) => {
    runMint.burnLosses(harden({ RUN: toBurn }), seat);
  };

  /** @type {Parameters<typeof makeInnerVault>[1]} */
  const managerMock = Far('vault manager mock', {
    getLiquidationMargin() {
      return LIQUIDATION_MARGIN;
    },
    getLoanFee() {
      return makeRatio(500n, runBrand, BASIS_POINTS);
    },
    getInterestRate() {
      return currentInterest;
    },
    getCollateralBrand() {
      return collateralBrand;
    },
    getDebtBrand: () => runBrand,

    getChargingPeriod() {
      return DAY;
    },
    getRecordingPeriod() {
      return DAY;
    },
    getNotifier: () => managerNotifier,
    maxDebtFor,
    mintAndReallocate,
    burnAndRecord,
    getCollateralQuote() {
      return Promise.resolve({
        quoteAmount: AmountMath.make(runBrand, 0n),
        quotePayment: null,
      });
    },
    getCompoundedInterest: () => compoundedInterest,
    updateVaultPriority: () => {
      // noop
    },
    mintforVault: async amount => {
      runMint.mintGains({ RUN: amount });
    },
  });

  const innerVault = await makeInnerVault(
    zcf,
    managerMock,
    // eslint-disable-next-line no-plusplus
    String(vaultCounter++),
  );

  const advanceRecordingPeriod = () => {
    timer.tick();

    // skip the debt calculation for this mock manager
    const currentInterestAsMultiplicand = makeRatio(
      100n + currentInterest.numerator.value,
      currentInterest.numerator.brand,
    );
    compoundedInterest = multiplyRatios(
      compoundedInterest,
      currentInterestAsMultiplicand,
    );
  };

  const setInterestRate = percent => {
    currentInterest = makeRatio(percent, runBrand);
  };

  zcf.setTestJig(() => ({
    advanceRecordingPeriod,
    collateralKit,
    runMint,
    setInterestRate,
    vault: innerVault,
  }));

  async function makeHook(seat) {
    const vaultKit = await innerVault.initVaultKit(seat);
    return {
      vault: innerVault,
      runMint,
      collateralKit,
      actions: Far('vault actions', {
        add() {
          return vaultKit.invitationMakers.AdjustBalances();
        },
      }),
      notifier: vaultKit.vaultNotifier,
    };
  }

  console.log(`makeContract returning`);

  const vaultAPI = Far('vaultAPI', {
    makeAdjustBalancesInvitation() {
      return innerVault.makeAdjustBalancesInvitation();
    },
    mintRun(amount) {
      return paymentFromZCFMint(zcf, runMint, amount);
    },
  });

  const testInvitation = zcf.makeInvitation(makeHook, 'foo');
  return harden({ creatorInvitation: testInvitation, creatorFacet: vaultAPI });
}
