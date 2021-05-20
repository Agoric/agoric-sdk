// @ts-check

/* global setImmediate */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers';
import { natSafeMath } from '@agoric/zoe/src/contractSupport';

import { makeRewards } from '../src/rewards/rewards';

const { add, subtract, multiply, floorDivide } = natSafeMath;

function makeFakeToCosmos() {
  const messages = [];

  const toCosmos = {
    proposerReward: (validator, payment) => {
      messages.push({ msg: 'proposerReward', validator, payment });
    },
    commission: (payment, validator) => {
      messages.push({ msg: 'commission', payment, validator });
    },
    rewards: (payment, validator) => {
      messages.push({ msg: 'rewards', payment, validator });
    },
  };

  const admin = {
    getMessages: () => messages,
  };

  return { admin, toCosmos };
}

function makeFakeTreasuryDisburser(issuer, initialFunds) {
  const purseOfHolding = E(issuer).makeEmptyPurse();
  E(purseOfHolding).deposit(initialFunds);

  const disburser = {
    getRewardAllocation: blockReward => E(purseOfHolding).withdraw(blockReward),
  };

  return { disburser };
}

// Some notifier updates aren't propagating sufficiently quickly for the tests.
// This invocation (thanks to Warner) waits for all promises that can fire to
// have all their callbacks run
async function waitForPromisesToSettle() {
  const pk = makePromiseKit();
  setImmediate(pk.resolve);
  return pk.promise;
}

function makeMessageAsserter(t, issuer) {
  return async function assertMessage(message, type, name, expectedAmount) {
    t.deepEqual(message.msg, type);
    t.deepEqual(message.validator, name);
    await assertPayoutAmount(t, issuer, message.payment, expectedAmount);
  };
}

function blockRewards(reward, shares) {
  const poolShare = floorDivide(95n * reward, 100n);
  const totalShares = shares.reduce((share, tot) => share + tot);
  let remaining = reward;
  const resultShares = shares.map(share => {
    const s = floorDivide(multiply(share, poolShare), totalShares);
    remaining -= s;
    return s;
  });
  return [remaining, ...resultShares];
}

test('create Validator and delegate', async t => {
  const { toCosmos, admin } = makeFakeToCosmos();
  const { moolaR, moola } = setup();
  const assertMessage = makeMessageAsserter(t, moolaR.issuer);
  const blockTimer = buildManualTimer(console.log);
  const epochTimer = buildManualTimer(console.log);
  const { disburser } = makeFakeTreasuryDisburser(
    moolaR.issuer,
    moolaR.mint.mintPayment(moola(1000)),
  );
  const { apiFromCosmos } = makeRewards(
    toCosmos,
    epochTimer,
    blockTimer,
    disburser,
    moolaR.issuer,
    moolaR.brand,
  );

  apiFromCosmos.createValidator(5n, 10n, 'v1', 'd1', 1500n);
  apiFromCosmos.createValidator(5n, 10n, 'v2', 'd2', 1000n);
  apiFromCosmos.delegate('d3', 'v1', 500n);
  await blockTimer.tick();
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 3000n, 5n);
  const rewards = blockRewards(40n, [2000n, 1000n]);
  await waitForPromisesToSettle();

  const messages = admin.getMessages();
  await assertMessage(messages[0], 'rewards', 'v1', moola(rewards[1]));
  await assertMessage(messages[1], 'rewards', 'v2', moola(rewards[2]));
  await assertMessage(messages[2], 'proposerReward', 'v2', moola(rewards[0]));
});

test('create Validator and 2 delegates', async t => {
  const { toCosmos, admin } = makeFakeToCosmos();
  const { moolaR, moola } = setup();
  const assertMessage = makeMessageAsserter(t, moolaR.issuer);
  const blockTimer = buildManualTimer(console.log);
  const epochTimer = buildManualTimer(console.log);
  const { disburser } = makeFakeTreasuryDisburser(
    moolaR.issuer,
    moolaR.mint.mintPayment(moola(1000)),
  );
  const { apiFromCosmos } = makeRewards(
    toCosmos,
    epochTimer,
    blockTimer,
    disburser,
    moolaR.issuer,
    moolaR.brand,
  );
  apiFromCosmos.createValidator(5n, 10n, 'v1', 'd1', 1000n);
  apiFromCosmos.createValidator(5n, 10n, 'v2', 'd2', 1500n);
  apiFromCosmos.delegate('d3', 'v1', 500n);
  apiFromCosmos.delegate('d4', 'v2', 800n);

  await blockTimer.tick();
  await apiFromCosmos.endBlock(60n, 'v1', 2500n, 3800n, 5n);
  const rewards = blockRewards(60n, [1500n, 2300n]);
  await waitForPromisesToSettle();

  const messages = admin.getMessages();
  await assertMessage(messages[0], 'rewards', 'v1', moola(rewards[1]));
  await assertMessage(messages[1], 'rewards', 'v2', moola(rewards[2]));
  await assertMessage(messages[2], 'proposerReward', 'v1', moola(rewards[0]));
});

test('create Validator and redelegate', async t => {
  const { toCosmos, admin } = makeFakeToCosmos();
  const { moolaR, moola } = setup();
  const assertMessage = makeMessageAsserter(t, moolaR.issuer);
  const blockTimer = buildManualTimer(console.log);
  const epochTimer = buildManualTimer(console.log);
  const { disburser } = makeFakeTreasuryDisburser(
    moolaR.issuer,
    moolaR.mint.mintPayment(moola(1000)),
  );
  const { apiFromCosmos } = makeRewards(
    toCosmos,
    epochTimer,
    blockTimer,
    disburser,
    moolaR.issuer,
    moolaR.brand,
  );

  apiFromCosmos.createValidator(5n, 10n, 'v1', 'd1', 1500n);
  apiFromCosmos.createValidator(5n, 10n, 'v2', 'd2', 1000n);
  apiFromCosmos.delegate('d3', 'v1', 500n);
  await blockTimer.tick();
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 3000n, 5n);
  const rewards1 = blockRewards(40n, [2000n, 1000n]);
  await waitForPromisesToSettle();

  const messages1 = admin.getMessages();
  await assertMessage(messages1[0], 'rewards', 'v1', moola(rewards1[1]));
  await assertMessage(messages1[1], 'rewards', 'v2', moola(rewards1[2]));
  await assertMessage(messages1[2], 'proposerReward', 'v2', moola(rewards1[0]));

  apiFromCosmos.redelegate('d3', 'v1', 'v2', 3, 300n);

  await blockTimer.tick();
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 3000n, 5n);
  const rewards2 = blockRewards(40n, [1700n, 1300n]);
  await waitForPromisesToSettle();

  const messages2 = admin.getMessages();
  await assertMessage(messages2[3], 'rewards', 'v1', moola(rewards2[1]));
  await assertMessage(messages2[4], 'rewards', 'v2', moola(rewards2[2]));
  await assertMessage(messages2[5], 'proposerReward', 'v2', moola(rewards2[0]));
});

test('partial undelegate', async t => {
  const { toCosmos, admin } = makeFakeToCosmos();
  const { moolaR, moola } = setup();
  const assertMessage = makeMessageAsserter(t, moolaR.issuer);
  const blockTimer = buildManualTimer(console.log);
  const epochTimer = buildManualTimer(console.log);
  const { disburser } = makeFakeTreasuryDisburser(
    moolaR.issuer,
    moolaR.mint.mintPayment(moola(1000)),
  );
  const { apiFromCosmos } = makeRewards(
    toCosmos,
    epochTimer,
    blockTimer,
    disburser,
    moolaR.issuer,
    moolaR.brand,
  );

  apiFromCosmos.createValidator(5n, 10n, 'v1', 'd1', 1500n);
  apiFromCosmos.createValidator(5n, 10n, 'v2', 'd2', 1000n);
  apiFromCosmos.delegate('d3', 'v1', 500n);
  await blockTimer.tick();
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 3000n, 5n);
  const rewards1 = blockRewards(40n, [2000n, 1000n]);
  await waitForPromisesToSettle();

  const messages = admin.getMessages();
  await assertMessage(messages[0], 'rewards', 'v1', moola(rewards1[1]));
  await assertMessage(messages[1], 'rewards', 'v2', moola(rewards1[2]));
  await assertMessage(messages[2], 'proposerReward', 'v2', moola(rewards1[0]));

  apiFromCosmos.undelegate('d3', 'v1', 200n, 3);
  await blockTimer.tick();
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 2800n, 5n);
  const rewards2 = blockRewards(40n, [1800n, 1000n]);
  await waitForPromisesToSettle();

  const messages2 = admin.getMessages();
  await assertMessage(messages2[3], 'rewards', 'v1', moola(rewards2[1]));
  await assertMessage(messages2[4], 'rewards', 'v2', moola(rewards2[2]));
  await assertMessage(messages2[5], 'proposerReward', 'v2', moola(rewards2[0]));
});
