import '@agoric/zoe/exported.js';
import { E } from '@endo/eventual-send';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { AmountMath } from '@agoric/ertp';
import {
  ceilMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';
import { TimeMath } from '@agoric/time';
import { headValue } from '../supports.js';
import { getDataFromVstorage } from './tools.js';

export const assertBidderPayout = async (
  t,
  bidderSeat,
  run,
  curr,
  aeth,
  coll,
) => {
  const bidderResult = await E(bidderSeat).getOfferResult();
  t.is(bidderResult, 'Your bid has been accepted');
  const payouts = await E(bidderSeat).getPayouts();
  const { Collateral: bidderCollateral, Bid: bidderBid } = payouts;
  (!bidderBid && curr === 0n) ||
    (await assertPayoutAmount(t, run.issuer, bidderBid, run.make(curr)));
  (!bidderCollateral && coll === 0n) ||
    (await assertPayoutAmount(
      t,
      aeth.issuer,
      bidderCollateral,
      aeth.make(coll),
      'amount ',
    ));
};

export const assertReserveState = async (metricTracker, method, expected) => {
  switch (method) {
    case 'initial':
      await metricTracker.assertInitial(expected);
      break;
    case 'like':
      await metricTracker.assertLike(expected);
      break;
    case 'state':
      await metricTracker.assertState(expected);
      break;
    default:
      console.log('Default');
      break;
  }
};

export const assertVaultCurrentDebt = async (t, vault, debt) => {
  const debtAmount = await E(vault).getCurrentDebt();

  if (debt === 0n) {
    t.deepEqual(debtAmount.value, debt);
    return;
  }

  const fee = ceilMultiplyBy(debt, t.context.rates.mintFee);

  t.deepEqual(
    debtAmount,
    AmountMath.add(debt, fee),
    'borrower Minted amount does not match Vault current debt',
  );
};

export const assertVaultCollateral = async (
  t,
  vault,
  collateralValue,
  asset,
) => {
  const collateralAmount = await E(vault).getCollateralAmount();

  t.deepEqual(collateralAmount, asset.make(collateralValue));
};

export const assertMintedAmount = async (t, vaultSeat, wantMinted) => {
  const { Minted } = await E(vaultSeat).getFinalAllocation();

  t.truthy(AmountMath.isEqual(Minted, wantMinted));
};

export const assertMintedProceeds = async (t, vaultSeat, wantMinted) => {
  const { Minted } = await E(vaultSeat).getFinalAllocation();
  const { Minted: proceedsMinted } = await E(vaultSeat).getPayouts();

  t.truthy(AmountMath.isEqual(Minted, wantMinted));

  t.truthy(
    AmountMath.isEqual(
      await E(t.context.run.issuer).getAmountOf(proceedsMinted),
      wantMinted,
    ),
  );
};

export const assertVaultLocked = async (
  t,
  vaultNotifier,
  lockedValue,
  asset,
) => {
  const notification = await E(vaultNotifier).getUpdateSince();
  const lockedAmount = notification.value.locked;

  t.deepEqual(lockedAmount, asset.make(lockedValue));
};

export const assertVaultDebtSnapshot = async (t, vaultNotifier, wantMinted) => {
  const notification = await E(vaultNotifier).getUpdateSince();
  const debtSnapshot = notification.value.debtSnapshot;
  const fee = ceilMultiplyBy(wantMinted, t.context.rates.mintFee);

  t.deepEqual(debtSnapshot, {
    debt: AmountMath.add(wantMinted, fee),
    interest: makeRatio(100n, t.context.run.brand),
  });

  return notification;
};

export const assertVaultState = async (t, vaultNotifier, phase) => {
  const notification = await E(vaultNotifier).getUpdateSince();
  const vaultState = notification.value.vaultState;

  t.is(vaultState, phase);

  return notification;
};

export const assertVaultSeatExited = async (t, vaultSeat) => {
  t.truthy(await E(vaultSeat).hasExited());
};

export const assertVaultFactoryRewardAllocation = async (
  t,
  vaultFactory,
  rewardValue,
) => {
  const rewardAllocation = await E(vaultFactory).getRewardAllocation();

  t.deepEqual(rewardAllocation, {
    Minted: t.context.run.make(rewardValue),
  });
};

export const assertCollateralProceeds = async (t, seat, colWanted, issuer) => {
  const { Collateral: withdrawnCol } = await E(seat).getFinalAllocation();
  const proceeds4 = await E(seat).getPayouts();
  t.deepEqual(withdrawnCol, colWanted);

  const collateralWithdrawn = await proceeds4.Collateral;
  t.truthy(
    AmountMath.isEqual(
      await E(issuer).getAmountOf(collateralWithdrawn),
      colWanted,
    ),
  );
};

// Update these assertions to use a tracker similar to test-auctionContract
export const assertBookData = async (
  t,
  auctioneerBookDataSubscriber,
  expectedBookData,
) => {
  const auctioneerBookData = await E(
    auctioneerBookDataSubscriber,
  ).getUpdateSince();

  t.deepEqual(auctioneerBookData.value, expectedBookData);
};

export const assertAuctioneerSchedule = async (
  t,
  auctioneerPublicTopics,
  expectedSchedule,
) => {
  const auctioneerSchedule = await E(
    auctioneerPublicTopics.schedule.subscriber,
  ).getUpdateSince();

  t.deepEqual(auctioneerSchedule.value, expectedSchedule);
};

export const assertAuctioneerPathData = async (
  t,
  hasTopics,
  brand,
  topicName,
  path,
  dataKeys,
) => {
  let topic;
  if (brand) {
    topic = await E(hasTopics)
      .getPublicTopics(brand)
      .then(topics => topics[topicName]);
  } else {
    topic = await E(hasTopics)
      .getPublicTopics()
      .then(topics => topics[topicName]);
  }

  t.is(await topic?.storagePath, path, 'topic storagePath must match');
  const latest = /** @type {Record<string, unknown>} */ (
    await headValue(topic.subscriber)
  );
  if (dataKeys !== undefined) {
    // TODO consider making this a shape instead
    t.deepEqual(Object.keys(latest), dataKeys, 'keys in topic feed must match');
  }
};

export const assertVaultData = async (
  t,
  vaultDataSubscriber,
  vaultDataVstorage,
) => {
  const auctioneerBookData = await E(vaultDataSubscriber).getUpdateSince();
  t.deepEqual(auctioneerBookData.value, vaultDataVstorage[0][1]);
};

export const assertNodeInStorage = async ({
  t,
  rootNode,
  desiredNode,
  expected,
}) => {
  const [...storageData] = await getDataFromVstorage(rootNode, desiredNode);
  t.is(storageData.length !== 0, expected);
};

// Currently supports only one collateral manager
export const assertLiqNodeForAuctionCreated = async ({
  t,
  rootNode,
  auctioneerPF,
  auctionType = 'next', // 'live' is the other option
  expected = false,
}) => {
  const schedules = await E(auctioneerPF).getSchedules();
  const { startTime, startDelay } = schedules[`${auctionType}AuctionSchedule`];
  const nominalStart = TimeMath.subtractAbsRel(startTime, startDelay);

  await assertNodeInStorage({
    t,
    rootNode,
    desiredNode: `vaultFactory.managers.manager0.liquidations.${nominalStart}`,
    expected,
  });
};

export const assertStorageData = async ({ t, path, storageRoot, expected }) => {
  /** @type Array */
  const [[, value]] = await getDataFromVstorage(storageRoot, path);
  t.deepEqual(value, expected);
};

export const assertVaultNotification = async ({ t, notifier, expected }) => {
  const { value } = await E(notifier).getUpdateSince();
  t.like(value, expected);
};
