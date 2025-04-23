import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { E, type EReturn } from '@endo/far';
import { makePublishKit } from '@agoric/notifier';
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
      bootstrap: { storage },
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      mocks: { transferBridge },
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
    () => storage.getDeserialized(`fun.txns.${evidence.txHash}`),
    undefined,
    'no record of txn until observed',
  );
  await eventLoopIteration();
  const bridgePos = snapshot();

  // now observe, which triggers forward()
  txPub.publisher.publish({ evidence, isRisk: false });

  // and make the forward() succeed
  await transmitVTransferEvent('acknowledgementPacket');

  const [outgoingForward] = since(bridgePos).local;
  t.like(outgoingForward, {
    type: 'VLOCALCHAIN_EXECUTE_TX',
    address: addresses.settlementAccount,
    messages: [
      {
        '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      },
    ],
  });
  const [outgoingForwardMessage] = outgoingForward.messages;
  t.is(
    outgoingForwardMessage.token.amount,
    String(evidence.tx.amount),
    'full amount is transferred via `.forward()`',
  );

  const forwardInfo = JSON.parse(outgoingForwardMessage.memo).forward;
  t.is(forwardInfo.receiver, EUD, 'receiver is osmo10tt0');

  // in lieu of transmitTransferAck so we can set a nonce that matches our initial Advance
  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: outgoingForwardMessage.receiver,
      sender: outgoingForwardMessage.sender,
      target: outgoingForwardMessage.sender,
      sourceChannel: outgoingForwardMessage.sourceChannel,
      sequence: BigInt(Number(evidence.txHash.slice(2))),
      denom: outgoingForwardMessage.token.denom,
      amount: BigInt(outgoingForwardMessage.token.amount),
    }),
  );
  await eventLoopIteration();

  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    { status: 'FORWARDED' },
  ]);
});

test.serial('Observed after mint: Forward failed', async t => {
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

  const user = makeCustomer('Otto', cctp, txPub.publisher, feeConfig, chainHub);

  // publish a risky transaction, so the Advance is skipped and forward() instead
  const evidence = await user.sendFast(t, 5_000_000n, 'osmo10tt0', true);

  // and make the forward() timeout
  await mint(evidence);
  await transmitVTransferEvent('timeoutPacket');

  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    {
      risksIdentified: ['RISK1'],
      status: 'ADVANCE_SKIPPED',
    },
    { status: 'FORWARD_FAILED' },
  ]);

  // Contract's retry succeeds
  await transmitVTransferEvent('acknowledgementPacket');
  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    {
      risksIdentified: ['RISK1'],
      status: 'ADVANCE_SKIPPED',
    },
    { status: 'FORWARD_FAILED' },
    { status: 'FORWARDED' },
  ]);
});

test.serial.only('Interleave scenario', async t => {
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
  const bob = makeCustomer('Bob', cctp, txPub.publisher, feeConfig, chainHub);
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
  await transmitVTransferEvent('timeoutPacket');

  t.deepEqual(storage.getDeserialized(`fun.txns.${carolEv.txHash}`), [
    { evidence: carolEv, status: 'OBSERVED' },
    {
      risksIdentified: ['RISK1'],
      status: 'ADVANCE_SKIPPED',
    },
    { status: 'FORWARD_FAILED' },
  ]);

  // Now, Alice and Bob's interleave their requests
  const aliceEv = await alice.sendFast(t, 1_000_000n, EUD);
  await transmitVTransferEvent('acknowledgementPacket');
  await eventLoopIteration();

  // const bobEv = await bob.sendFast(t, 2_000_000n, EUD);
  t.deepEqual(storage.getDeserialized(`fun.txns.${aliceEv.txHash}`), [
    { evidence: aliceEv, status: 'OBSERVED' },
    { status: 'ADVANCING' },
  ]);
  // t.deepEqual(storage.getDeserialized(`fun.txns.${bobEv.txHash}`), [
  //   { evidence: bobEv, status: 'OBSERVED' },
  //   { status: 'ADVANCING' },
  // ]);

  // FIXME how to get Alice's advance to complete?
  t.deepEqual(storage.getDeserialized(`fun.txns.${aliceEv.txHash}`), [
    { evidence: aliceEv, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
  ]);

  // await mint(aliceEv);
  // // Carol's mint arrives
  // await transmitVTransferEvent('acknowledgementPacket');
  // t.deepEqual(storage.getDeserialized(`fun.txns.${aliceEv.txHash}`), [
  //   { evidence: aliceEv, status: 'OBSERVED' },
  //   { status: 'ADVANCING' },
  //   { status: 'DISBURSED' },
  // ]);

  // await mint(bobEv);

  // Carol
});
