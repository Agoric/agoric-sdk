/** @file DEPRECATED use the vault test driver instead */
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { makePublishKit, observeNotifier } from '@agoric/notifier';
import {
  makeFakeMarshaller,
  makeFakeStorage,
} from '@agoric/notifier/tools/testSupports.js';
import {
  prepareRecorderKit,
  unitAmount,
} from '@agoric/zoe/src/contractSupport/index.js';
import {
  floorDivideBy,
  makeRatio,
  multiplyBy,
  multiplyRatios,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import { priceFrom } from '../../src/auction/util.js';
import { paymentFromZCFMint } from '../../src/vaultFactory/burn.js';
import { prepareVault } from '../../src/vaultFactory/vault.js';

const BASIS_POINTS = 10000n;
const SECONDS_PER_HOUR = 60n * 60n;
const DAY = SECONDS_PER_HOUR * 24n;

const marshaller = makeFakeMarshaller();

/**
 * @param {ZCF} zcf
 * @param {{ feeMintAccess: FeeMintAccess }} privateArgs
 * @param {import('@agoric/swingset-liveslots').Baggage} baggage
 */
export async function start(zcf, privateArgs, baggage) {
  console.log(`contract started`);
  assert.typeof(privateArgs.feeMintAccess, 'object');

  const collateralKit = makeIssuerKit('Collateral');
  const { brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  const stableMint = await zcf.registerFeeMint(
    'Minted',
    privateArgs.feeMintAccess,
  );
  const { brand: stableBrand } = stableMint.getIssuerRecord();

  const LIQUIDATION_MARGIN = makeRatio(105n, stableBrand);

  const { zcfSeat: vaultFactorySeat } = zcf.makeEmptySeatKit();

  let vaultCounter = 0;

  let currentInterest = makeRatio(5n, stableBrand); // 5%
  let compoundedInterest = makeRatio(100n, stableBrand); // starts at 1.0, no interest

  const { zcfSeat: mintSeat } = zcf.makeEmptySeatKit();

  const { subscriber: assetSubscriber } = makePublishKit();

  const timer = buildZoeManualTimer(console.log, 0n, { timeStep: DAY });
  const options = {
    actualBrandIn: collateralBrand,
    actualBrandOut: stableBrand,
    priceList: [80],
    tradeList: undefined,
    timer,
  };
  const priceAuthority = await makeFakePriceAuthority(options);
  const collateralUnit = await unitAmount(collateralBrand);
  const quoteNotifier = E(priceAuthority).makeQuoteNotifier(
    collateralUnit,
    stableBrand,
  );
  let storedCollateralQuote;
  void observeNotifier(quoteNotifier, {
    updateState(value) {
      storedCollateralQuote = value;
    },
    fail(reason) {
      console.error('quoteNotifier failed to iterate', reason);
    },
  });

  const maxDebtFor = collateralAmount => {
    // floorDivide because we want the debt ceiling lower
    return floorDivideBy(
      multiplyBy(collateralAmount, priceFrom(storedCollateralQuote)),
      LIQUIDATION_MARGIN,
    );
  };

  /** @type {MintAndTransfer} */
  const mintAndTransfer = (mintReceiver, toMint, fee, nonMintTransfers) => {
    const kept = AmountMath.subtract(toMint, fee);
    stableMint.mintGains(harden({ Minted: toMint }), mintSeat);
    /** @type {TransferPart[]} */
    const transfers = [
      ...nonMintTransfers,
      [mintSeat, vaultFactorySeat, { Minted: fee }],
      [mintSeat, mintReceiver, { Minted: kept }],
    ];
    try {
      zcf.atomicRearrange(harden(transfers));
    } catch (e) {
      console.error('mintAndTransfer caught', e);
      stableMint.burnLosses(harden({ Minted: toMint }), mintSeat);
      throw e;
    }
  };

  const burn = (toBurn, seat) => {
    stableMint.burnLosses(harden({ Minted: toBurn }), seat);
  };

  /** @type {Parameters<typeof makeVault>[0]} */
  const managerMock = Far('vault manager mock', {
    getGovernedParams() {
      return {
        getDebtLimit() {
          throw Error('not implemented');
        },
        getLiquidationMargin() {
          return LIQUIDATION_MARGIN;
        },
        getLiquidationPenalty() {
          throw Error('not implemented');
        },
        getMintFee() {
          return makeRatio(500n, stableBrand, BASIS_POINTS);
        },
        getInterestRate() {
          return currentInterest;
        },
        getChargingPeriod() {
          return DAY;
        },
        getLiquidationPadding() {
          // XXX re-use
          return LIQUIDATION_MARGIN;
        },
        getMinInitialDebt() {
          return AmountMath.makeEmpty(stableBrand);
        },
        getRecordingPeriod() {
          return DAY;
        },
      };
    },
    getCollateralBrand() {
      return collateralBrand;
    },
    getDebtBrand: () => stableBrand,

    getAssetSubscriber: () => assetSubscriber,
    maxDebtFor,
    mintAndTransfer,
    burn,
    getCollateralQuote() {
      return Promise.reject(Error('Not implemented'));
    },
    getCompoundedInterest: () => compoundedInterest,
    scopeDescription: base => `VCW: ${base}`,
    handleBalanceChange: () => {
      console.warn('mock handleBalanceChange does nothing');
    },
    mintforVault: async amount => {
      stableMint.mintGains({ Minted: amount });
    },
  });

  const makeRecorderKit = prepareRecorderKit(baggage, marshaller);

  const makeVault = prepareVault(baggage, makeRecorderKit, zcf);

  const { self: vault } = await makeVault(
    managerMock,
    // eslint-disable-next-line no-plusplus
    String(vaultCounter++),
    makeFakeStorage('test.vaultContractWrapper'),
  );

  const advanceRecordingPeriod = async () => {
    await timer.tick();

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
    currentInterest = makeRatio(percent, stableBrand);
  };

  zcf.setTestJig(() => ({
    advanceRecordingPeriod,
    collateralKit,
    stableMint,
    setInterestRate,
    vault,
  }));

  async function makeHook(seat) {
    const vaultKit = await vault.initVaultKit(seat, makeFakeStorage('test'));
    return {
      vault,
      stableMint,
      collateralKit,
      actions: Far('vault actions', {
        add() {
          return vaultKit.invitationMakers.AdjustBalances();
        },
      }),
    };
  }

  console.log(`makeContract returning`);

  const vaultAPI = Far('vaultAPI', {
    makeAdjustBalancesInvitation() {
      return vault.makeAdjustBalancesInvitation();
    },
    mintRun(amount) {
      return paymentFromZCFMint(zcf, stableMint, amount);
    },
  });

  const testInvitation = zcf.makeInvitation(makeHook, 'foo');
  return harden({ creatorInvitation: testInvitation, creatorFacet: vaultAPI });
}
