import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { USDCProposalShapes } from '@agoric/fast-usdc/src/pool-share-math.js';
import { PoolMetricsShape } from '@agoric/fast-usdc/src/type-guards.js';
import { makeFeeTools } from '@agoric/fast-usdc/src/utils/fees.js';
import {
  eventLoopIteration,
  inspectMapStore,
} from '@agoric/internal/src/testing-utils.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, type EReturn } from '@endo/far';
import { matches } from '@endo/patterns';
import type { FastUsdcSF } from '../src/fast-usdc.contract.ts';
import { fastUsdcSetup, uusdcOnAgoric } from './supports.js';

import * as contractExports from '../src/fast-usdc.contract.js';
import {
  makeCustomer,
  makeLP,
  makeOracleOperator,
  makeTestContext,
  purseOf,
} from './contract-setup.ts';

const test = anyTest as TestFn<EReturn<typeof makeTestContext>>;
test.before(async t => (t.context = await makeTestContext(t)));

// baggage after a simple startInstance, without any other startup logic
test('initial baggage', async t => {
  const {
    brands: { usdc },
    commonPrivateArgs,
  } = await fastUsdcSetup(t);

  let contractBaggage;
  const setJig = ({ baggage }) => {
    contractBaggage = baggage;
  };

  const { zoe, bundleAndInstall } = await setUpZoeForTest({ setJig });
  const installation: Installation<FastUsdcSF> =
    await bundleAndInstall(contractExports);

  await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer },
    { usdcDenom: uusdcOnAgoric },
    // @ts-expect-error XXX contract expecting CosmosChainInfo with bech32
    // prefix but the Orchestration setup doesn't have it. The tests pass anyway
    // so we elide this infidelity to production.
    commonPrivateArgs,
  );

  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});

test('used baggage', async t => {
  const { startKit } = t.context;

  const tree = inspectMapStore(startKit.contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});

test('getStaticInfo', async t => {
  const { startKit } = t.context;
  const { publicFacet } = startKit;

  t.deepEqual(await E(publicFacet).getStaticInfo(), {
    addresses: {
      poolAccount: makeTestAddress(),
      settlementAccount: makeTestAddress(1),
    },
  });
});

test.serial('OCW operators redeem invitations and start watching', async t => {
  const {
    startKit: { zoe, invitations },
    evm: { txPub },
    sync,
  } = t.context;
  const operators = await Promise.all(
    invitations.operator.map(async opInv => {
      const op = makeOracleOperator(opInv, txPub.subscriber, zoe, t);
      await E(op).watch();
      return op;
    }),
  );
  sync.ocw.resolve(operators);
});

// XXX: replace test.serial() with promise synchronization?

test.serial('C25 - LPs can deposit USDC', async t => {
  const {
    startKit: { zoe, instance, metricsSub },
    common: {
      utils,
      brands: { usdc },
    },
    sync,
  } = t.context;
  const usdcPurse = purseOf(usdc.issuer, utils);
  // C25 - MUST support multiple liquidity providers
  const lp = {
    lp50: makeLP('Logan', usdcPurse(50_000_000n), zoe, instance),
    lp200: makeLP('Larry', usdcPurse(200_000_000n), zoe, instance),
  };

  const {
    value: {
      shareWorth: { numerator: balance0 },
    },
  } = await E(metricsSub).getUpdateSince();

  await Promise.all([
    E(lp.lp200).deposit(t, 200_000_000n),
    E(lp.lp50).deposit(t, 50_000_000n),
  ]);

  sync.lp.resolve(lp);
  const {
    value: {
      shareWorth: { numerator: poolBalance },
    },
  } = await E(metricsSub).getUpdateSince();
  t.deepEqual(
    poolBalance,
    AmountMath.make(usdc.brand, 250_000_000n + balance0.value),
  );
});

test.serial('Contract skips advance when risks identified', async t => {
  const {
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    evm: { cctp, txPub },
    bridges: { snapshot, since },
    mint,
  } = t.context;
  const custEmpty = makeCustomer(
    'Skippy',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );
  const bridgePos = snapshot();
  const sent = await custEmpty.sendFast(t, 1_000_000n, 'osmo123', true);
  const bridgeTraffic = since(bridgePos);
  await mint(sent);
  custEmpty.checkSent(t, bridgeTraffic, 'forward');
  t.log('No advancement, just settlement');
  // ack IBC transfer for forward
  await transmitVTransferEvent('acknowledgementPacket', -1);
});

test.serial('STORY01: advancing happy path for 100 USDC', async t => {
  const {
    common: {
      brands: { usdc },
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { inspectBankBridge, transmitVTransferEvent },
    },
    evm: { cctp, txPub },
    startKit: { metricsSub },
    bridges: { snapshot, since },
    mint,
  } = t.context;
  const cust1 = makeCustomer(
    'Carl',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );

  const bridgePos = snapshot();
  const sent1 = await cust1.sendFast(t, 108_000_000n, 'osmo1234advanceHappy');
  // ack IBC transfer for advance
  await transmitVTransferEvent('acknowledgementPacket', -1);
  const expectedTransitions = [
    { evidence: sent1, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
  ];
  t.deepEqual(t.context.readTxnRecord(sent1), expectedTransitions);

  const { calculateAdvance, calculateSplit } = makeFeeTools(feeConfig);
  const expectedAdvance = calculateAdvance(
    usdc.make(sent1.tx.amount),
    chainHub.resolveAccountId(sent1.aux.recipientAddress),
  );
  t.log('advancer sent to PoolAccount', expectedAdvance);
  t.deepEqual(inspectBankBridge().at(-1), {
    amount: String(expectedAdvance.value),
    denom: uusdcOnAgoric,
    recipient: makeTestAddress(),
    type: 'VBANK_GIVE',
  });

  cust1.checkSent(t, since(bridgePos));

  const emptyMetrics = {
    encumberedBalance: usdc.makeEmpty(),
    shareWorth: {
      numerator: usdc.make(1n),
      denominator: { value: 1n },
    },
    totalBorrows: usdc.makeEmpty(),
    totalContractFees: usdc.makeEmpty(),
    totalPoolFees: usdc.makeEmpty(),
    totalRepays: usdc.makeEmpty(),
  };
  const par250 = {
    numerator: usdc.make(250_000_001n),
    denominator: { value: 250_000_001n },
  };

  t.like(
    await E(metricsSub)
      .getUpdateSince()
      .then(r => r.value),
    {
      ...emptyMetrics,
      encumberedBalance: expectedAdvance,
      shareWorth: par250,
      totalBorrows: expectedAdvance,
    },
    'metrics while advancing',
  );

  await mint(sent1);

  // C8 - "Contract MUST be able to initialize settlement process when Noble mints USDC."
  // The metrics are a useful proxy, but the contract could lie.
  // The real test of whether the contract turns minted funds into liquidity is
  // the ability to advance the funds (in later tests).
  const split = calculateSplit(
    usdc.make(sent1.tx.amount),
    chainHub.resolveAccountId(sent1.aux.recipientAddress),
  );
  t.like(
    await E(metricsSub)
      .getUpdateSince()
      .then(r => r.value),
    {
      ...emptyMetrics,
      shareWorth: {
        ...par250,
        numerator: AmountMath.add(par250.numerator, split.PoolFee),
      },
      totalBorrows: { value: 105839999n },
      totalContractFees: { value: 432000n },
      totalPoolFees: { value: 1728001n },
      totalRepays: { value: 105839999n },
    },
    'metrics after advancing',
  );

  t.deepEqual(t.context.readTxnRecord(sent1), [
    ...expectedTransitions,
    { split, status: 'DISBURSED' },
  ]);
});

// most likely in exo unit tests
test.todo(
  'C21 - Contract MUST log / timestamp each step in the transaction flow',
);

test.serial('STORY03: see accounting metrics', async t => {
  const {
    startKit: { metricsSub },
  } = t.context;
  const { value: metrics } = await E(metricsSub).getUpdateSince();

  t.log(metrics);
  t.true(matches(metrics, PoolMetricsShape));
});
test.todo('document metrics storage schema');
test.todo('get metrics from vstorage');

test.serial('STORY05: LP collects fees on 100 USDC', async t => {
  const {
    sync,
    common: {
      brands: { usdc },
    },
  } = t.context;

  const lp = await sync.lp.promise;
  const got = await E(lp.lp200).withdraw(t, 0.5); // redeem 1/2 my shares

  // C3 - Contract MUST calculate ...
  // Mostly, see unit tests for calculateAdvance, calculateSplit
  // TODO: add a feeTools unit test for the magic number below.
  t.deepEqual(got, AmountMath.add(usdc.units(100), usdc.make(691_200n)));

  await E(lp.lp200).deposit(t, 100_000_000n); // put all but the fees back in
});

test.serial('With 250 available, 3 race to get ~100', async t => {
  const {
    bridges: { snapshot, since },
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    startKit: { metricsSub },
    mint,
  } = t.context;

  const cust = {
    racer1: makeCustomer('Racer1', cctp, txPub.publisher, feeConfig, chainHub),
    racer2: makeCustomer('Racer2', cctp, txPub.publisher, feeConfig, chainHub),
    racer3: makeCustomer('Racer3', cctp, txPub.publisher, feeConfig, chainHub),
  };

  await cust.racer3.checkPoolAvailable(t, 125_000_000n, metricsSub);

  const bridgePos = snapshot();
  const [sent1, sent2, sent3] = await Promise.all([
    cust.racer1.sendFast(t, 110_000_000n, 'osmo1234a'),
    cust.racer2.sendFast(t, 120_000_000n, 'osmo1234b'),
    cust.racer3.sendFast(t, 125_000_000n, 'osmo1234c'),
  ]);

  cust.racer1.checkSent(t, since(bridgePos));
  cust.racer2.checkSent(t, since(bridgePos));
  // TODO/WIP: cust.racer3.checkSent(t, since(bridgePos), 'forward - LP depleted');

  // Ack all three transfers using their index relative to the end
  await transmitVTransferEvent('acknowledgementPacket', -3); // First racer's transfer
  await transmitVTransferEvent('acknowledgementPacket', -2); // Second racer's transfer
  await transmitVTransferEvent('acknowledgementPacket', -1); // Third racer's transfer

  await Promise.all([mint(sent1), mint(sent2), mint(sent3)]);
});

test.serial('STORY05(cont): LPs withdraw all liquidity', async t => {
  const { sync } = t.context;

  const lp = await sync.lp.promise;
  const [a, b] = await Promise.all([
    E(lp.lp200).withdraw(t, 1),
    E(lp.lp50).withdraw(t, 1),
  ]);
  t.log({ a, b, sum: AmountMath.add(a, b) });
  t.truthy(a);
  t.truthy(b);
});

test.serial('withdraw all liquidity while ADVANCING', async t => {
  const {
    bridges: { snapshot, since },
    common: {
      commonPrivateArgs: { feeConfig },
      utils,
      brands: { usdc },
      bootstrap: { storage },
      facadeServices: { chainHub },
    },
    evm: { cctp, txPub },
    mint,
    startKit: { zoe, instance },
  } = t.context;

  const usdcPurse = purseOf(usdc.issuer, utils);
  // 1. Alice deposits 10 USDC for 10 FastLP
  const alice = makeLP('Alice', usdcPurse(10_000_000n), zoe, instance);
  await E(alice).deposit(t, 10_000_000n);

  // 2. Bob initiates an advance of 6, reducing the pool to 4
  const bob = makeCustomer('Bob', cctp, txPub.publisher, feeConfig, chainHub);
  const bridgePos = snapshot();
  const sent = await bob.sendFast(t, 6_000_000n, 'osmo123bob5');
  await eventLoopIteration();
  bob.checkSent(t, since(bridgePos));

  // 3. Alice proposes to withdraw 7 USDC
  await t.throwsAsync(E(alice).withdraw(t, 0.7), {
    message:
      'cannot withdraw {"brand":"[Alleged: USDC brand]","value":"[7000000n]"}; {"brand":"[Alleged: USDC brand]","value":"[5879999n]"} is in use; stand by for pool to return to {"brand":"[Alleged: USDC brand]","value":"[10000001n]"}',
  });

  // 4. Bob's advance is settled
  await mint(sent);
  // Ack Bob's advance transfer (it was the last one)
  await utils.transmitVTransferEvent('acknowledgementPacket', -1);

  t.like(storage.getDeserialized(`fun.txns.${sent.txHash}`), [
    { evidence: sent, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { status: 'DISBURSED' },
  ]);

  // Now Alice can withdraw all her liquidity.
  await E(alice).withdraw(t, 1);
});

test.serial('withdraw fees using creatorFacet', async t => {
  const {
    startKit: { zoe, creatorFacet },
    common: {
      brands: { usdc },
    },
  } = t.context;
  const proposal: USDCProposalShapes['withdrawFees'] = {
    want: { USDC: usdc.units(1.25) },
  };

  const usdPurse = await E(usdc.issuer).makeEmptyPurse();
  {
    const balancePre = await E(creatorFacet).getContractFeeBalance();
    t.log('contract fee balance before withdrawal', balancePre);
    const toWithdraw = await E(creatorFacet).makeWithdrawFeesInvitation();
    const seat = E(zoe).offer(toWithdraw, proposal);
    await t.notThrowsAsync(E(seat).getOfferResult());
    const payout = await E(seat).getPayout('USDC');
    const amt = await E(usdPurse).deposit(payout);
    t.log('withdrew fees', amt);
    t.deepEqual(amt, usdc.units(1.25));
    const balancePost = await E(creatorFacet).getContractFeeBalance();
    t.log('contract fee balance after withdrawal', balancePost);
    t.deepEqual(AmountMath.subtract(balancePre, usdc.units(1.25)), balancePost);
  }

  {
    const toWithdraw = await E(creatorFacet).makeWithdrawFeesInvitation();
    const tooMuch = { USDC: usdc.units(20) };
    const seat = E(zoe).offer(toWithdraw, { want: tooMuch });
    await t.throwsAsync(E(seat).getOfferResult(), {
      message: /cannot withdraw {.*}; only {.*} available/,
    });
    const payout = await E(seat).getPayout('USDC');
    const amt = await E(usdPurse).deposit(payout);
    t.deepEqual(amt, usdc.units(0));
  }
});

test.serial('STORY09: insufficient liquidity: no FastUSDC option', async t => {
  // STORY09 - As the Fast USDC end user,
  // I should see the option to use Fast USDC unavailable
  // on the UI (and unusable) if there are not funds in the
  // MarketMaker’s account
  const {
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
    },
    evm: { cctp, txPub },
    startKit: { metricsSub },
  } = t.context;
  const early = makeCustomer(
    'Unice',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );
  const available = await early.checkPoolAvailable(t, 5_000_000n, metricsSub);
  t.false(available);
});

test.serial('C20 - Contract MUST function with an empty pool', async t => {
  const {
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    evm: { cctp, txPub },
    bridges: { snapshot, since },
    mint,
  } = t.context;
  const custEmpty = makeCustomer(
    'Earl',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );
  const bridgePos = snapshot();
  const sent = await custEmpty.sendFast(t, 150_000_000n, 'osmo123');
  const bridgeTraffic = since(bridgePos);
  await mint(sent);
  custEmpty.checkSent(t, bridgeTraffic, 'forward');
  t.log('No advancement, just settlement');
  // ack IBC transfer for forward
  await transmitVTransferEvent('acknowledgementPacket', -1);
});

test.serial('Settlement for unknown transaction (operator down)', async t => {
  const {
    sync,
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
  const operators = await sync.ocw.promise;

  // Simulate 2 of 3 operators being unavailable
  operators[0].setActive(false);
  operators[1].setActive(false);

  const opDown = makeCustomer(
    'Otto',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );

  const bridgePos = snapshot();
  const EUD = 'osmo10tt0';
  const mintAmt = 5_000_000n;
  const sent = await opDown.sendFast(t, mintAmt, EUD);
  await mint(sent);
  const bridgeTraffic = since(bridgePos);

  t.like(
    bridgeTraffic.bank,
    [
      {
        amount: String(mintAmt),
        sender: 'faucet',
        type: 'VBANK_GRAB',
      },
      {
        amount: String(mintAmt),
        recipient: 'agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g',
        type: 'VBANK_GIVE',
      },
    ],
    '20 USDC arrive at the settlement account',
  );

  // No ack needed here as the first sendFast didn't trigger an IBC transfer (operators were down)
  t.deepEqual(bridgeTraffic.local, [], 'no IBC transfers initially');

  // activate oracles and submit evidence; expect Settler to forward (slow path)
  // 'C12 - Contract MUST only pay back the Pool (fees) only if they started the advance before USDC is minted',
  operators[0].setActive(true);
  operators[1].setActive(true);
  // set the 3rd operator to inactive so it doesn't report a 2nd time
  operators[2].setActive(false);

  // compute nonce from initial report so a new txId is not generated by `sendFast` helper
  const nonce = Number(sent.txHash.slice(2));
  await opDown.sendFast(t, mintAmt, EUD, false, nonce);

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
    String(sent.tx.amount),
    'full amount is transferred via `.forward()`',
  );

  const forwardInfo = JSON.parse(outgoingForwardMessage.memo).forward;
  t.is(forwardInfo.receiver, EUD, 'receiver is osmo10tt0');

  // Ack the forwarded transfer (it was the last one)
  await transmitVTransferEvent('acknowledgementPacket', -1);

  t.deepEqual(t.context.readTxnRecord(sent), [
    { evidence: sent, status: 'OBSERVED' },
    { status: 'FORWARDED' },
  ]);
});

test.serial('mint received while ADVANCING', async t => {
  // Settler should `disburse` on Transfer success
  const {
    bridges: { snapshot, since },
    common: {
      commonPrivateArgs: { feeConfig },
      utils,
      brands: { usdc },
      bootstrap: { storage },
      facadeServices: { chainHub },
    },
    evm: { cctp, txPub },
    mint,
    startKit: { zoe, instance, metricsSub },
  } = t.context;

  t.log('top of liquidity pool');
  const usdcPurse = purseOf(usdc.issuer, utils);
  const lp999 = makeLP('Leo ', usdcPurse(999_000_000n), zoe, instance);
  await E(lp999).deposit(t, 999_000_000n);

  const earlySettle = makeCustomer(
    'Earl E.',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );
  const bridgePos = snapshot();

  await earlySettle.checkPoolAvailable(t, 5_000_000n, metricsSub);
  const sent = await earlySettle.sendFast(t, 5_000_000n, 'osmo1earl3');
  await eventLoopIteration();
  earlySettle.checkSent(t, since(bridgePos));

  await mint(sent);
  // mint received before Advance transfer settles
  // Ack the advance transfer (it was the last one)
  await utils.transmitVTransferEvent('acknowledgementPacket', -1);

  const split = makeFeeTools(feeConfig).calculateSplit(
    usdc.make(5_000_000n),
    chainHub.resolveAccountId(sent.aux.recipientAddress),
  );
  t.deepEqual(storage.getDeserialized(`fun.txns.${sent.txHash}`), [
    { evidence: sent, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { split, status: 'DISBURSED' },
  ]);
});

test.todo(
  'fee levels MUST be visible to external parties - i.e., written to public storage',
);
