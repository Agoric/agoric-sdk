import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makePublishKit } from '@agoric/notifier';
import { E, type EReturn } from '@endo/far';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.ts';
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

test.serial('partial completion', async t => {
  const {
    bridges: { snapshot, since },
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
      mocks: { transferBridge },
    },
    mint,
    addresses,
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
    t.context.common.readTxnRecord(aliceEv),
    { status: 'FORWARD_FAILED' },
    'Alice forward failed initially',
  );

  const bobEv = await bob.sendFast(t, 2_000_000n, 'osmo1bob', true);
  await mint(bobEv);
  await transmitVTransferEvent('timeoutPacket', -1); // Bob forward fails
  t.like(
    t.context.common.readTxnRecord(bobEv),
    { status: 'FORWARD_FAILED' },
    'Bob forward failed initially',
  );

  // 2. Alice's retry succeeds
  // Manually trigger retry for Alice (in reality, this might happen later)
  // We simulate this by directly calling fromBridge for Alice's tx
  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: addresses.settlementAccount, // Should match the failed forward target
      sender: 'noble1test', // Should match the failed forward source
      target: addresses.settlementAccount, // Target is settlement account for retry
      sourceChannel: 'channel-0', // Assuming channel-0, adjust if needed
      sequence: BigInt(Number(aliceEv.txHash.slice(2) + 4)), // incremented in sync
      denom: 'ibc/uusdc', // Adjust if denom differs
      amount: BigInt(aliceEv.tx.amount),
    }),
  );
  await eventLoopIteration();
  t.like(
    t.context.common.readTxnRecord(aliceEv),
    { status: 'FORWARDED' },
    "Alice's retry succeeded",
  );

  // 3. Bob's is still failed
  t.like(
    t.context.common.readTxnRecord(bobEv),
    { status: 'FORWARD_FAILED' },
    "Bob's forward is still failed before Carol's tx",
  );

  // 4. Carol's succeeds on first try, triggering retry for remaining failed (Bob)
  const bridgePos = snapshot();
  const carolEv = await carol.sendFast(t, 3_000_000n, 'osmo1carol', true);
  await mint(carolEv);
  await transmitVTransferEvent('acknowledgementPacket', -1); // Carol forward succeeds

  t.like(
    t.context.common.readTxnRecord(carolEv),
    { status: 'FORWARDED' },
    "Carol's forward succeeded",
  );

  // 5. Verify only Bob's was retried
  const outgoingRetries = since(bridgePos).local;
  t.is(outgoingRetries.length, 1, 'Only one retry attempt triggered');
  const [retryMessage] = outgoingRetries[0].messages;
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
  await transmitVTransferEvent('acknowledgementPacket', -1); // Bob's retry succeeds
  t.like(
    t.context.common.readTxnRecord(bobEv),
    { status: 'FORWARDED' },
    "Bob's retry succeeded eventually",
  );
});

test.serial.failing('Interleave scenario', async t => {
  // FailedForwards contains 1 tx for Carol to eip155:1 at 0:00
  // Alice requests advance to eip155:1 at 0:00, it fulfills at 0:30
  // Bob requests advance to eip155:1 at 0:05, it fulfills at 0:35
  // At 0:30, Carol's FailedForward is retried, it fulfills at 0:60
  // At 0:35, onWorking is called which triggers attemptToClear(). getFailedForwards() returns Carol's tx
  // this. .transfer() might reject since SettlementAccount is out of money. It might fulfill if there are funds in there and carol will get 2x her request. If it rejects, it's re-added to failedForwards and Carol might get 2x in the future

  const {
    evm: { cctp, txPub },
    common: {
      bootstrap: { storage },
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    mint,
  } = t.context;

  // The key here is that they're going to the same chain. We re-use the EUD just to simplify the test.
  const EUD = 'eip155:1:0x1234567890123456789012345678901234567890';

  const alice = makeCustomer(
    'Alice',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );
  // const bob = makeCustomer('Bob', cctp, txPub.publisher, feeConfig, chainHub);
  const carol = makeCustomer(
    'Carol',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );

  // First, Carol's forward fails
  // publish a risky transaction, so the Advance is skipped and forward() instead
  const carolEv = await carol.sendFast(t, 3_000_000n, EUD, true);
  await mint(carolEv);
  await transmitVTransferEvent('timeoutPacket', -1);

  t.deepEqual(storage.getDeserialized(`orchtest.txns.${carolEv.txHash}`), [
    { evidence: carolEv, status: 'OBSERVED' },
    {
      risksIdentified: ['RISK1'],
      status: 'ADVANCE_SKIPPED',
    },
    { status: 'FORWARD_FAILED' },
  ]);

  // Now, Alice and Bob's interleave their requests
  const aliceEv = await alice.sendFast(t, 1_000_000n, EUD);
  await transmitVTransferEvent('acknowledgementPacket', -1);

  // const bobEv = await bob.sendFast(t, 2_000_000n, EUD);
  t.deepEqual(storage.getDeserialized(`orchtest.txns.${aliceEv.txHash}`), [
    { evidence: aliceEv, status: 'OBSERVED' },
    { status: 'ADVANCING' },
  ]);
  // t.deepEqual(storage.getDeserialized(`orchtest.txns.${bobEv.txHash}`), [
  //   { evidence: bobEv, status: 'OBSERVED' },
  //   { status: 'ADVANCING' },
  // ]);

  // FIXME how to get Alice's advance to complete?
  t.deepEqual(storage.getDeserialized(`orchtest.txns.${aliceEv.txHash}`), [
    { evidence: aliceEv, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
  ]);

  // await mint(aliceEv);
  // // Carol's mint arrives
  // await transmitVTransferEvent('acknowledgementPacket');
  // t.deepEqual(storage.getDeserialized(`orchtest.txns.${aliceEv.txHash}`), [
  //   { evidence: aliceEv, status: 'OBSERVED' },
  //   { status: 'ADVANCING' },
  //   { status: 'DISBURSED' },
  // ]);

  // await mint(bobEv);

  // Carol
});
