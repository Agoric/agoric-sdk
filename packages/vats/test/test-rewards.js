// @ts-check

/* global setImmediate */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints';

import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers';
import { makeRewards } from '../src/rewards/rewards';

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
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 3000n, 5n, 5n);
  await waitForPromisesToSettle();

  const messages = admin.getMessages();
  await assertMessage(messages[0], 'rewards', 'v1', moola(25n));
  await assertMessage(messages[1], 'rewards', 'v2', moola(12n));
  await assertMessage(messages[2], 'proposerReward', 'v2', moola(3n));
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
  await apiFromCosmos.endBlock(60n, 'v1', 2500n, 3800n, 5n, 5n);
  await waitForPromisesToSettle();

  const messages = admin.getMessages();
  await assertMessage(messages[0], 'rewards', 'v1', moola(22n));
  await assertMessage(messages[1], 'rewards', 'v2', moola(34n));
  await assertMessage(messages[2], 'proposerReward', 'v1', moola(4n));
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
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 3000n, 5n, 5n);
  await waitForPromisesToSettle();

  const messages1 = admin.getMessages();
  await assertMessage(messages1[0], 'rewards', 'v1', moola(25n));
  await assertMessage(messages1[1], 'rewards', 'v2', moola(12n));
  await assertMessage(messages1[2], 'proposerReward', 'v2', moola(3n));

  apiFromCosmos.redelegate('d3', 'v1', 'v2', 3, 300n);

  await blockTimer.tick();
  await apiFromCosmos.endBlock(40n, 'v2', 2500n, 3000n, 5n, 5n);
  await waitForPromisesToSettle();

  const messages2 = admin.getMessages();
  await assertMessage(messages2[3], 'rewards', 'v1', moola(21n));
  await assertMessage(messages2[4], 'rewards', 'v2', moola(16n));
  await assertMessage(messages2[5], 'proposerReward', 'v2', moola(3n));
});
