import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makePublishKit } from '@agoric/notifier';
import { E, type EReturn } from '@endo/far';
import {
  makeCustomer,
  makeLP,
  makeOracleOperator,
  makeTestContext,
  purseOf,
} from './contract-setup.ts';

const test = anyTest as TestFn<EReturn<typeof makeTestContext>>;
test.before(async t => {
  t.context = await makeTestContext(t);
  const {
    startKit: { zoe, instance, invitations },
    common: {
      brands: { usdc },
      utils,
    },
    evm: { txPub },
    sync,
  } = t.context;
  // start oracles in this before() hook since this test doesn't test their behavior
  sync.ocw.resolve(
    await Promise.all(
      invitations.operator.map(async opInv => {
        const op = makeOracleOperator(opInv, txPub.subscriber, zoe, t);
        await E(op).watch();
        return op;
      }),
    ),
  );

  // Fund the LP with 500 USDCC
  const usdcPurse = purseOf(usdc.issuer, utils);
  const lp500 = makeLP('Logan', usdcPurse(500_000_000n), zoe, instance);
  await E(lp500).deposit(t, 200_000_000n);
  sync.lp.resolve({ lp500 });
});

test.serial('Observed after mint: Forward', async t => {
  const {
    bridges: { snapshot, since },
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    mint,
    addresses,
  } = t.context;

  const nullPublishKit = makePublishKit();
  const user = makeCustomer(
    'Otto',
    cctp,
    nullPublishKit.publisher, // so it's not attested
    feeConfig,
    chainHub,
  );

  const EUD = 'osmo10tt0';
  const mintAmt = 5_000_000n;
  const evidence = await user.sendFast(t, mintAmt, EUD);

  await mint(evidence);

  t.throws(
    () => t.context.common.readTxnRecord(evidence),
    undefined,
    'no record of txn until observed',
  );
  await eventLoopIteration();
  const bridgePos = snapshot();

  // now observe, which triggers forward()
  txPub.publisher.publish({ evidence, isRisk: false });
  await eventLoopIteration(); // let the publish trigger actions

  // Get localchain message details for assertion
  const [outgoingForwardTx] = since(bridgePos).local;
  t.like(outgoingForwardTx, {
    type: 'VLOCALCHAIN_EXECUTE_TX',
    address: addresses.settlementAccount,
    messages: [
      {
        '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      },
    ],
  });
  const [outgoingForwardMessage] = outgoingForwardTx.messages;
  t.is(
    outgoingForwardMessage.token.amount,
    String(evidence.tx.amount),
    'full amount is transferred via `.forward()`',
  );

  const forwardInfo = JSON.parse(outgoingForwardMessage.memo).forward;
  t.is(forwardInfo.receiver, EUD, 'receiver is osmo10tt0');

  // and make the forward() succeed by acking the transfer (it was the last one)
  await transmitVTransferEvent('acknowledgementPacket', -1);

  t.deepEqual(t.context.common.readTxnRecord(evidence), [
    { evidence, status: 'OBSERVED' },
    { status: 'FORWARDED' },
  ]);
});

test.serial('Observed after mint: Forward failed', async t => {
  const {
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    mint,
  } = t.context;

  const user = makeCustomer('Otto', cctp, txPub.publisher, feeConfig, chainHub);

  // publish a risky transaction, so the Advance is skipped and forward() instead
  const evidence = await user.sendFast(t, 5_000_000n, 'osmo10tt0', true);

  // and make the forward() timeout
  await mint(evidence);

  // Make the forward() timeout by sending a timeout event for the last transfer
  await transmitVTransferEvent('timeoutPacket', -1);

  t.deepEqual(t.context.common.readTxnRecord(evidence), [
    { evidence, status: 'OBSERVED' },
    {
      risksIdentified: ['RISK1'],
      status: 'ADVANCE_SKIPPED',
    },
    { status: 'FORWARD_FAILED' },
  ]);

  // Contract's retry succeeds
  await transmitVTransferEvent('acknowledgementPacket', -1);
  t.deepEqual(t.context.common.readTxnRecord(evidence), [
    { evidence, status: 'OBSERVED' },
    {
      risksIdentified: ['RISK1'],
      status: 'ADVANCE_SKIPPED',
    },
    { status: 'FORWARD_FAILED' },
    { status: 'FORWARDED' },
  ]);
});

test.serial('Forwards are retried maxRetries times', async t => {
  const {
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent, inspectLocalBridge },
    },
    mint,
  } = t.context;

  const max = makeCustomer('Max', cctp, txPub.publisher, feeConfig, chainHub);
  const maxEud = 'osmo1max';

  // publish a risky transaction, so the Advance is skipped and forward() instead
  const maxEvidence = await max.sendFast(t, 3_000_000n, maxEud, true);
  await mint(maxEvidence);
  // timeout the forward attempt
  await transmitVTransferEvent('timeoutPacket', -1);

  t.deepEqual(t.context.common.readTxnRecord(maxEvidence), [
    { evidence: maxEvidence, status: 'OBSERVED' },
    {
      risksIdentified: ['RISK1'],
      status: 'ADVANCE_SKIPPED',
    },
    { status: 'FORWARD_FAILED' },
  ]);

  const getForwardAttempts = (eud: string) =>
    inspectLocalBridge().filter(x => x.messages?.[0].memo.includes(eud)).length;

  t.is(getForwardAttempts(maxEud), 2, 'failure is automatically retried');

  for (let i = 3; i <= 6; i += 1) {
    await transmitVTransferEvent('timeoutPacket', -1);
    await eventLoopIteration(); // XXX safe to remove?
    t.is(getForwardAttempts(maxEud), i, `retry attempt ${i}`);
  }

  // timeout the 6th (max) retry attempt
  await transmitVTransferEvent('timeoutPacket', -1);
  t.is(
    getForwardAttempts(maxEud),
    6,
    'transfer not attempted after maxRetries',
  );
  // Log should show something like:
  // Route cosmos:osmosis-1 is derelict. A successful transfer must be observed for failed forwards to be reattempted.

  // a new transaction is attempted and its success awakens the channel
  const ned = makeCustomer('ned', cctp, txPub.publisher, feeConfig, chainHub);
  const nedEv = await ned.sendFast(t, 1_200_000n, 'osmo1ned', true);
  await mint(nedEv);
  await transmitVTransferEvent('acknowledgementPacket', -1);
  t.deepEqual(t.context.common.readTxnRecord(nedEv).at(-1), {
    status: 'FORWARDED',
  });

  // Log should show something like:
  // Route cosmos:osmosis-1 is working again. Attempting to clear 1 failed forwards for cosmos:osmosis-1

  // Ensure the failed forwards list is clear for subsequent tests
  t.is(getForwardAttempts(maxEud), 7, 'one more on healthy channel');
  await transmitVTransferEvent('acknowledgementPacket', -1);
  t.deepEqual(t.context.common.readTxnRecord(maxEvidence).at(-1), {
    status: 'FORWARDED',
  });
});

test.serial('partial completion', async t => {
  const {
    bridges: { snapshot, since },
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    mint,
  } = t.context;

  const alice = makeCustomer(
    'Alice',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );
  const bob = makeCustomer('Bob', cctp, txPub.publisher, feeConfig, chainHub);
  const carol = makeCustomer(
    'Carol',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );

  // 1. Alice and Bob fail initially (risky tx -> skipAdvance -> forward timeout)
  const aliceEv = await alice.sendFast(t, 1_000_000n, 'osmo1alice', true);
  await mint(aliceEv);
  await transmitVTransferEvent('timeoutPacket', -1); // Alice forward fails

  t.like(
    t.context.common.readTxnRecord(aliceEv).at(-1),
    { status: 'FORWARD_FAILED' },
    'Alice forward failed initially',
  );
  // a retry attempt is triggered but has not yet resolved

  const bobEv = await bob.sendFast(t, 2_000_000n, 'osmo1bob', true);
  await mint(bobEv);
  await transmitVTransferEvent('timeoutPacket', -1); // Bob forward fails
  t.like(
    t.context.common.readTxnRecord(bobEv).at(-1),
    { status: 'FORWARD_FAILED' },
    'Bob forward failed initially',
  );
  // a retry attempt is triggered but has not yet resolved
  // There should now be 2 failed forwards in the local chain:
  // to cosmos:osmosis-1:osmo1alice for 0x000001
  // to cosmos:osmosis-1:osmo1bob   for 0x000002
  // but the former is in progress so isn't retried yet.

  // 2. Alice's automatic retry succeeds
  await transmitVTransferEvent('acknowledgementPacket', -3); // past two are Bob's
  t.like(
    t.context.common.readTxnRecord(aliceEv).at(-1),
    { status: 'FORWARDED' },
    "Alice's auto retry succeeded",
  );

  // 3. Bob's is still failed
  await transmitVTransferEvent('timeoutPacket', -1);
  t.like(
    t.context.common.readTxnRecord(bobEv).at(-1),
    { status: 'FORWARD_FAILED' },
    "Bob's forward is still failed before Carol's tx",
  );
  // He has auto-retried but it hasn't resolved yet
  // There should now be 1 failed forward in the local chain:
  // to cosmos:osmosis-1:osmo1bob   for 0x000002

  // 4. Carol's succeeds on first try
  const bridgePos = snapshot();
  const carolEv = await carol.sendFast(t, 3_000_000n, 'osmo1carol', true);
  await mint(carolEv);
  await transmitVTransferEvent('acknowledgementPacket', -1); // Carol forward succeeds

  t.like(
    t.context.common.readTxnRecord(carolEv).at(-1),
    { status: 'FORWARDED' },
    "Carol's forward succeeded",
  );

  // 5. Verify only Bob's will be retried
  // First timeout his last attempt so it fails
  await transmitVTransferEvent('timeoutPacket', -2);
  const localOut = since(bridgePos).local;
  t.is(localOut.length, 2, 'Carol and Bob went out');
  const [retryMessage] = localOut[1].messages;
  const retryMemo = JSON.parse(retryMessage.memo);
  t.is(
    retryMemo.forward.receiver,
    'osmo1bob',
    "Retry attempt was for Bob's transaction",
  );
  t.is(
    retryMessage.token.amount,
    String(bobEv.tx.amount),
    "Retry attempt has Bob's amount",
  );

  // 6. Bob's retry succeeds
  await transmitVTransferEvent('acknowledgementPacket', -1);
  t.like(
    t.context.common.readTxnRecord(bobEv).at(-1),
    { status: 'FORWARDED' },
    "Bob's retry succeeded eventually",
  );
});

type InterleaveScenario = 'bobFulfills' | 'bobRejects';

/**
 * This test ensures interleaving does not result in Carol receiving multiple
 * Forwards (successful IBC transfers).
 *
 * Here is the timeline of events:
 * 1. FailedForwards contains 1 tx for Carol to osmosis at 0:00.
 *    - note: the test attempts + fails Carol maxRetries: 6 times to set this up.
 * 2. Alice requests advance to osmosis at 0:00, it fulfills at 0:30.
 * 3. Bob requests advance to osmosis at 0:05, it settles (fulfillment or rejection) at 0:35.
 * 4. At 0:30, Carol's FailedForward is retried, we expect it to fulfill at 0:60.
 * 5. At 0:35, there will be a calls to `noteSuccess` and `noteFailure` depending
 *    on the scenario (`bobFulfills` or `bobRejects`).
 */
const makeInterleaveScenario = test.macro({
  title: (_, scenario: InterleaveScenario) => `interleave via ${scenario}`,
  exec: async (t, scenario: InterleaveScenario) => {
    const bobFulfills = scenario === 'bobFulfills'; // otherwise bobRejects
    const {
      evm: { cctp, txPub },
      common: {
        commonPrivateArgs: { feeConfig },
        facadeServices: { chainHub },
        utils: { transmitVTransferEvent, inspectLocalBridge },
      },
      mint,
    } = t.context;

    // Make EUDs unique to this test
    const [aliceEud, bobEud, carolEud] = [
      `osmo1alice${scenario}`,
      `osmo1bob${scenario}`,
      `osmo1carol${scenario}`,
    ];

    const [alice, bob, carol] = [
      makeCustomer('Alice', cctp, txPub.publisher, feeConfig, chainHub),
      makeCustomer('Bob', cctp, txPub.publisher, feeConfig, chainHub),
      makeCustomer('Carol', cctp, txPub.publisher, feeConfig, chainHub),
    ];

    // First, Carol's forward fails
    // publish a risky transaction, so the Advance is skipped and forward() instead
    const carolEv = await carol.sendFast(t, 3_000_000n, carolEud, true);
    await mint(carolEv);
    await transmitVTransferEvent('timeoutPacket', -1);

    t.deepEqual(t.context.common.readTxnRecord(carolEv), [
      { evidence: carolEv, status: 'OBSERVED' },
      {
        risksIdentified: ['RISK1'],
        status: 'ADVANCE_SKIPPED',
      },
      { status: 'FORWARD_FAILED' },
    ]);

    /** helper function to get # of outgoing MsgTransfer attempts to Carol's EUD */
    const getCarolAttempts = () =>
      inspectLocalBridge().filter(x => x.messages?.[0].memo.includes(carolEud))
        .length;

    t.is(getCarolAttempts(), 2, 'failure is automatically retried');

    // given RouteHealth maxFailures = 6, attempt and fail 6 times to get to a
    // terminal state
    for (let i = 3; i <= 6; i += 1) {
      await transmitVTransferEvent('timeoutPacket', -1);
      t.is(getCarolAttempts(), i, `retry attempt ${i}`);
    }
    await transmitVTransferEvent('timeoutPacket', -1);

    t.deepEqual(t.context.common.readTxnRecord(carolEv), [
      { evidence: carolEv, status: 'OBSERVED' },
      {
        risksIdentified: ['RISK1'],
        status: 'ADVANCE_SKIPPED',
      },
      ...Array(6).fill({ status: 'FORWARD_FAILED' }),
    ]);

    // Now, Alice and Bob interleave their requests
    const aliceEv = await alice.sendFast(t, 1_000_000n, aliceEud);
    t.deepEqual(t.context.common.readTxnRecord(aliceEv), [
      { evidence: aliceEv, status: 'OBSERVED' },
      { status: 'ADVANCING' },
    ]);

    const bobEv = await bob.sendFast(t, 2_000_000n, bobEud);
    t.deepEqual(t.context.common.readTxnRecord(bobEv), [
      { evidence: bobEv, status: 'OBSERVED' },
      { status: 'ADVANCING' },
    ]);

    const getIndexByEUD = (eud: string) => {
      const txs = inspectLocalBridge().filter(x => x?.messages?.length);
      const eudIdx = txs.findIndex(x => x.messages?.[0].memo.includes(eud));
      if (eudIdx === -1) throw new Error(`no tx found for ${eud}`);
      const res = (txs.length - eudIdx) * -1;
      return res;
    };

    t.is(getIndexByEUD(aliceEud), -2, "second to last tx is alice's");
    t.is(getIndexByEUD(bobEud), -1, "last tx is bob's");

    // Alice's advance settles
    await transmitVTransferEvent('acknowledgementPacket', -2);
    t.deepEqual(t.context.common.readTxnRecord(aliceEv), [
      { evidence: aliceEv, status: 'OBSERVED' },
      { status: 'ADVANCING' },
      { status: 'ADVANCED' },
    ]);

    t.is(
      getCarolAttempts(),
      7,
      'carol is retried since alice succeeds on same route',
    );

    // Bob's advance settles, while Carol's 7th attempt is still outstanding.
    // Depending on `scenario: InterleaveScenario`, it fulfills or times out.
    t.is(getIndexByEUD(bobEud), -2, 'bobs tx is now second to last');
    if (bobFulfills) {
      await transmitVTransferEvent('timeoutPacket', -2);
      t.deepEqual(t.context.common.readTxnRecord(bobEv), [
        { evidence: bobEv, status: 'OBSERVED' },
        { status: 'ADVANCING' },
        { status: 'ADVANCE_FAILED' },
      ]);
    } else {
      await transmitVTransferEvent('acknowledgementPacket', -2);
      t.deepEqual(t.context.common.readTxnRecord(bobEv), [
        { evidence: bobEv, status: 'OBSERVED' },
        { status: 'ADVANCING' },
        { status: 'ADVANCED' },
      ]);
    }

    t.is(
      getCarolAttempts(),
      7,
      'carol should no be retried when her forward attempt is unsettled',
    );

    // Carol's retry finally succeeds
    await transmitVTransferEvent('acknowledgementPacket', -1);
    t.deepEqual(t.context.common.readTxnRecord(carolEv), [
      { evidence: carolEv, status: 'OBSERVED' },
      {
        risksIdentified: ['RISK1'],
        status: 'ADVANCE_SKIPPED',
      },
      ...Array(6).fill({ status: 'FORWARD_FAILED' }),
      { status: 'FORWARDED' },
    ]);

    // alice and bob's mints arrive
    await mint(aliceEv);
    await mint(bobEv);
    t.like(t.context.common.readTxnRecord(aliceEv), [
      { evidence: aliceEv, status: 'OBSERVED' },
      { status: 'ADVANCING' },
      { status: 'ADVANCED' },
      { status: 'DISBURSED' },
    ]);

    if (bobFulfills) {
      t.deepEqual(t.context.common.readTxnRecord(bobEv), [
        { evidence: bobEv, status: 'OBSERVED' },
        { status: 'ADVANCING' },
        { status: 'ADVANCE_FAILED' },
        // consider acking the outgoing forward for bob, but not necessary for
        // the goal of this test
      ]);
    } else {
      t.like(t.context.common.readTxnRecord(bobEv), [
        { evidence: bobEv, status: 'OBSERVED' },
        { status: 'ADVANCING' },
        { status: 'ADVANCED' },
        { status: 'DISBURSED' },
      ]);
    }
  },
});

test.serial(makeInterleaveScenario, 'bobFulfills');
test.serial(makeInterleaveScenario, 'bobRejects');
