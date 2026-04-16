/**
 * @file openPortfolio flow tests; especially failure modes.
 *
 * @see {@link snapshots/portfolio-open.test.ts.md} for expected call logs.
 *
 * To facilitate review of snapshot diffs, add new tests *at the end*.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { GuestInterface } from '@agoric/async-flow';
import { AmountMath, type NatAmount } from '@agoric/ertp';
import { makeTracer, mustMatch } from '@agoric/internal';
import { makeExpectUnhandledRejectionMacro } from '@agoric/internal/src/lib-nodejs/ava-unhandled-rejection.js';
import { documentStorageSchema } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

import { type AccountId, type Orchestrator } from '@agoric/orchestration';
import {
  type AxelarChain,
  type FlowDetail,
  type FundsFlowPlan,
} from '@agoric/portfolio-api';
import {
  DEFAULT_FLOW_CONFIG,
  RebalanceStrategy,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import { passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import { hexToBytes } from '@noble/hashes/utils';
import type { Address } from 'abitype';
import type { Assertions } from 'ava';
import {
  provideEVMAccount,
  provideEVMAccountWithPermit,
  sendGMPContractCall,
  sendPermit2GMP,
} from '../src/axelar-gmp-legacy.flows.ts';
import {
  provideEVMAccount as provideEVMRoutedAccount,
  provideEVMAccountWithPermit as provideEVMRoutedAccountWithPermit,
  sendPermit2GMP as sendPermit2RoutedGMP,
  sendGMPContractCall as sendRoutedGMPContractCall,
} from '../src/axelar-gmp-router.flows.ts';
import { type PortfolioKit } from '../src/portfolio.exo.ts';
import {
  makeErrorList,
  provideCosmosAccount,
  executePlan as rawExecutePlan,
  openPortfolio as rawOpenPortfolio,
  rebalance as rawRebalance,
  wayFromSrcToDest,
  type PortfolioInstanceContext,
} from '../src/portfolio.flows.ts';
import { type EVMContext } from '../src/pos-evm.flows.ts';
import {
  agoricToNoble,
  makeSwapLockMessages,
  makeUnlockSwapMessages,
  nobleToAgoric,
  protocolUSDN,
} from '../src/pos-usdn.flows.ts';
import {
  type MovementDesc,
  type OfferArgsFor,
} from '../src/type-guards-steps.ts';
import { makeProposalShapes } from '../src/type-guards.ts';
import { predictWalletAddress } from '../src/utils/evm-orch-factory.ts';
import { makePortfolioSteps } from '../tools/plan-transfers.ts';
import {
  decodeCreateAndDepositPayload,
  decodeFunctionCall,
} from './abi-utils.ts';
import {
  BLD,
  USDC,
  docOpts,
  makeMockSeat,
  makePermitDetails,
  mocks,
  silent,
  type Mocks,
} from './flow-test-kit.ts';
import {
  axelarIdsMock,
  contractsMock,
  gmpAddresses,
  planUSDNDeposit,
} from './mocks.ts';
import {
  axelarCCTPConfig,
  makeIncomingVTransferEvent,
  makeStorageTools,
} from './supports.ts';

const expectUnhandled = makeExpectUnhandledRejectionMacro({
  test,
  importMetaUrl: import.meta.url,
});

const executePlan: typeof rawExecutePlan = (
  orch,
  ctx,
  seat,
  offerArgs,
  pKit,
  flowDetail,
  startedFlow,
  config = DEFAULT_FLOW_CONFIG,
  options,
) =>
  rawExecutePlan(
    orch,
    ctx,
    seat,
    offerArgs,
    pKit,
    flowDetail,
    startedFlow,
    config,
    options,
  );

const openPortfolio: typeof rawOpenPortfolio = (
  orch,
  ctx,
  seat,
  offerArgs,
  madeKit,
  config = DEFAULT_FLOW_CONFIG,
  ...args
) => rawOpenPortfolio(orch, ctx, seat, offerArgs, madeKit, config, ...args);

const rebalance: typeof rawRebalance = (
  orch,
  ctx,
  seat,
  offerArgs,
  kit,
  startedFlow,
  config = DEFAULT_FLOW_CONFIG,
) => rawRebalance(orch, ctx, seat, offerArgs, kit, startedFlow, config);

const { make } = AmountMath;
/* eslint-disable no-underscore-dangle */
/* We use _method to get it to sort before other properties. */

test('open portfolio with no positions', async t => {
  const { orch, ctx, offer, storage, cosmosId } = mocks();
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, {});
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [
    { _method: 'monitorTransfers' },
    {
      _method: 'transfer',
      address: { chainId: await cosmosId('noble') },
    },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

// XXX unlock too. use snapshot
test('Noble Dollar Swap, Lock messages', async t => {
  const { cosmosId } = mocks();
  const nobleId = await cosmosId('noble');

  const signer =
    'noble1reheu4ym85k9gktyf9vzhzt0zvqym9txwejsj4vaxdrw98wm4emsddarrd' as const;
  {
    const actual = makeSwapLockMessages(
      { value: signer, chainId: nobleId, encoding: 'bech32' },
      1200000n,
      { usdnOut: 1188000n, vault: 1 },
    );
    t.snapshot(actual, 'swap 1.2USDC for 1.188USDN');
  }

  {
    const actual = makeSwapLockMessages(
      { value: 'noble1test', chainId: nobleId, encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1 },
    );
    t.snapshot(actual, 'swap 5K USDC at parity');
  }

  {
    const actual = makeUnlockSwapMessages(
      { value: 'noble1test', chainId: nobleId, encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1, usdnOut: 4_900n * 1_000_000n },
    );
    t.snapshot(actual, 'un-swap 5K USDN < parity');
  }
});

test('makeSwapLockMessages uses parity amount for MsgLock when usdnOut is omitted', async t => {
  const { cosmosId } = mocks();
  const nobleId = await cosmosId('noble');

  const actual = makeSwapLockMessages(
    { value: 'noble1test', chainId: nobleId, encoding: 'bech32' },
    5_000n * 1_000_000n,
    { vault: 1 },
  );

  t.is(actual.msgSwap.min?.amount, '5000000000');
  t.is(
    actual.msgLock?.amount,
    '5000000000',
    'vaulted parity swap should not encode MsgLock amount as "undefined"',
  );
});

test('makePortfolioSteps for USDN position', async t => {
  const actual = await makePortfolioSteps({
    USDN: make(USDC, 50n * 1_000_000n),
  });

  const amount = make(USDC, 50n * 1_000_000n);
  const detail = { usdnOut: 49499999n };
  t.deepEqual(actual, {
    give: { Deposit: { brand: USDC, value: 50_000_000n } },
    steps: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDNVault', amount, detail },
    ],
  });
});

test('open portfolio with USDN position', async t => {
  const { give, steps } = await makePortfolioSteps({
    USDN: make(USDC, 50_000_000n),
  });
  const { orch, ctx, offer, storage, cosmosId, txResolver } = mocks({}, give);
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, { flow: steps });
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: await cosmosId('noble') } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: await cosmosId('noble') } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  // Needed due to an incomplete mock of IBC ack processing.
  await txResolver.drainPending();
  await documentStorageSchema(t, storage, docOpts);

  const { getPortfolioStatus } = makeStorageTools(storage);
  const { flowsRunning = {} } = await getPortfolioStatus(1);
  t.deepEqual(flowsRunning, {}, 'all flows are done by now');
});

const openAndTransfer = test.macro(
  async (
    t,
    goal: Partial<Record<YieldProtocol, NatAmount>>,
    makeEvents: () => VTransferIBCEvent[],
  ) => {
    const { give, steps } = await makePortfolioSteps(goal, { feeBrand: BLD });
    const { orch, ctx, offer, storage, tapPK, txResolver } = mocks({}, give);
    const { log, seat } = offer;

    const [actual] = await Promise.all([
      openPortfolio(orch, ctx, seat, { flow: steps }),
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
        async ([tap, _]) => {
          for (const event of makeEvents()) {
            t.log(`tap.receiveUpcall(${event})`);
            await tap.receiveUpcall(event);
          }
          await txResolver.drainPending();
        },
      ),
    ]);
    t.log(log.map(msg => msg._method).join(', '));

    t.snapshot(log, 'call log'); // see snapshot for call log
    t.is(passStyleOf(actual.invitationMakers), 'remotable');
    await documentStorageSchema(t, storage, docOpts);
  },
);

test(
  'open portfolio with Aave and USDN positions then inbound GMP',
  openAndTransfer,
  { Aave: make(USDC, 3_333_000_000n), USDN: make(USDC, 3_333_000_000n) },
  () => [],
);

test('open portfolio with Aave position', async t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      // Complete transactions.
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },

    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 2_000_000n } },
    },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('reject missing fee before committing anything', t => {
  const amount = AmountMath.make(USDC, 300n);
  t.throws(() =>
    wayFromSrcToDest({ src: '@Arbitrum', dest: 'Compound_Arbitrum', amount }),
  );
});

test('open portfolio with Compound position', async t => {
  const { give, steps } = await makePortfolioSteps(
    { Compound: make(USDC, 2_000_000n) },
    { fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } } },
  );
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    give,
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      flow: steps,
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'localTransfer', amounts: { Deposit: { value: 2_000_000n } } },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in localTransfer from seat to local account', async t => {
  const amount = make(USDC, 100n);
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { localTransfer: Error('localTransfer from seat failed') },
    { Deposit: amount },
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: [{ src: '<Deposit>', dest: '@agoric', amount }],
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');

  const nobleId = await cosmosId('noble');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'fail' },
  ]);
  t.log('we still get the invitationMakers and ICA address');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

// IBC failure causes NFA set-up to fail
test.skip('handle failure in IBC transfer', async t => {
  const { give, steps } = await makePortfolioSteps({ USDN: make(USDC, 100n) });
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { transfer: Error('IBC is on the fritz!!') },
    give,
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: steps,
  });
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: nobleId } }, // failed
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in executeEncodedTx', async t => {
  const { give, steps } = await makePortfolioSteps({ USDN: make(USDC, 100n) });
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { executeEncodedTx: Error('exec swaplock went kerflewey') },
    give,
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: steps,
  });
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const agoricId = await cosmosId('agoric');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' }, // fail
    { _method: 'transfer', address: { chainId: agoricId } }, // unwind
    { _method: 'executeEncodedTx' }, // unwind
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in recovery from executeEncodedTx', async t => {
  const amount = make(USDC, 100n);
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    {
      executeEncodedTx: Error('cannot swap. your money is no good here'),
      transfer: Error('road from noble washed out'),
    },
    { Deposit: amount },
  );
  const { log, seat } = offer;

  const detail = { usdnOut: 100n };
  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDNVault', amount, detail },
    ],
  });
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const agoricId = await cosmosId('agoric');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' }, // fail
    { _method: 'transfer', address: { chainId: agoricId } }, // fail to recover
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in sendGmp with Aave position', async t => {
  const amount = AmountMath.make(USDC, 300n);
  const feeAcct = AmountMath.make(BLD, 300n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { transfer: Error('ag->axelar: SOS!') },
    { Deposit: amount },
  );

  // Start the openPortfolio flow
  const portfolioPromise = openPortfolio(orch, { ...ctx }, offer.seat, {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
    ],
  });

  const actual = await portfolioPromise;
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Account: { value: 300n } } },
    { _method: 'transfer', address: { chainId: axelarId } }, // fails
    { _method: 'withdrawToSeat' }, // sendGmp recovery
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test(
  'open portfolio with Compound and USDN positions then rebalance',
  openAndTransfer,
  { Aave: make(USDC, 3_333_000_000n), USDN: make(USDC, 3_333_000_000n) },
  () => [
    makeIncomingVTransferEvent({
      hookQuery: { rebalance: RebalanceStrategy.Preset },
      amount: 1_000_000_000n,
      denom: `transfer/channel-1/uusdc`,
    }),
  ],
);

test.skip('rebalance handles stepFlow failure correctly', async t => {
  const { orch, ctx, offer } = mocks(
    {
      // Mock a failure in IBC transfer
      transfer: Error('IBC transfer failed'),
    },
    { Deposit: make(USDC, 500n) },
  );

  const { log, seat } = offer;

  const badOfferArgs: OfferArgsFor['rebalance'] = {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount: make(USDC, 500n) },
      { src: '@agoric', dest: '@noble', amount: make(USDC, 500n) },
      // This will trigger the mocked transfer error
      { src: '@noble', dest: 'USDN', amount: make(USDC, 500n) },
    ],
  };

  await t.throwsAsync(() =>
    rebalance(orch, ctx, seat, badOfferArgs, ctx.makePortfolioKit()),
  );

  // Check that seat.fail() was called, not seat.exit()
  const seatCalls = log.filter(entry => entry._cap === 'seat');
  const failCall = seatCalls.find(call => call._method === 'fail');
  const exitCall = seatCalls.find(call => call._method === 'exit');

  t.truthy(failCall, 'seat.fail() should be called on error');
  t.falsy(exitCall, 'seat.exit() should not be called on error');
  t.snapshot(log, 'call log');
});

test('claim rewards on Aave position', async t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const emptyAmount = AmountMath.make(USDC, 0n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const kit = await ctx.makePortfolioKit();
  await Promise.all([
    rebalance(
      orch,
      ctx,
      offer.seat,
      {
        flow: [
          {
            dest: '@Arbitrum',
            src: 'Aave_Arbitrum',
            amount: emptyAmount,
            fee: feeCall,
            claim: true,
          },
        ],
      },
      kit,
    ),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);

  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  const rawMemo = log[4].opts?.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'claimAllRewardsToSelf(address[])',
    'withdraw(address,uint256,address)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');

  await documentStorageSchema(t, storage, docOpts);
});

test('open portfolio with Beefy position', async t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Avalanche', amount, fee: feeAcct },
        {
          src: '@Avalanche',
          dest: 'Beefy_re7_Avalanche',
          amount,
          fee: feeCall,
        },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 2_000_000n } },
    },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);

  const rawMemo = log[8].opts?.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'approve(address,uint256)',
    'deposit(uint256)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');
});

test('wayFromSrcToDest handles +agoric -> @agoric', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const actual = wayFromSrcToDest({ src: '+agoric', dest: '@agoric', amount });
  t.deepEqual(actual, { how: 'send' });
});

test('Engine can move deposits +agoric -> @agoric', async t => {
  const { orch, ctx, offer, storage } = mocks({}, {});
  const { log } = offer;

  const amount = AmountMath.make(USDC, 2_000_000n);
  const kit = await ctx.makePortfolioKit();

  await rebalance(
    orch,
    ctx,
    offer.seat,
    { flow: [{ src: '+agoric', dest: '@agoric', amount }] },
    kit,
  );

  t.log(log.map(msg => msg._method).join(', '));

  const lca = kit.reader.getLocalAccount();
  t.is(lca.getAddress().value, 'agoric11028');
  t.like(log, [
    { _cap: 'agoric11028', _method: 'monitorTransfers' },
    {
      _cap: 'agoric11042',
      _method: 'send',
      toAccount: { value: 'agoric11028' },
    },
    { _method: 'exit' },
  ]);

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  await documentStorageSchema(t, storage, docOpts);
});

test('client can move to deposit LCA', async t => {
  const { orch, ctx, offer, storage } = mocks({}, {});
  const { log } = offer;

  const amount = AmountMath.make(USDC, 2_000_000n);
  const kit = await ctx.makePortfolioKit();

  await rebalance(
    orch,
    ctx,
    offer.seat,
    { flow: [{ src: '<Deposit>', dest: '+agoric', amount }] },
    kit,
  );
  t.like(log, [{ _method: 'monitorTransfers' }, { _method: 'localTransfer' }]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in provideCosmosAccount makeAccount', async t => {
  const amount = make(USDC, 100n);
  const chainToErr = new Map([['noble', Error('timeout creating ICA')]]);

  const { give, steps } = await makePortfolioSteps({ USDN: amount });
  const { orch, ctx, offer, storage } = mocks(
    { makeAccount: chainToErr },
    give,
  );
  const { log } = offer;

  // Create portfolio once for both attempts
  const kit = await ctx.makePortfolioKit();

  // First attempt - will fail creating noble account
  const seat1 = makeMockSeat({ Deposit: amount }, undefined, log);

  const attempt1 = rebalance(orch, ctx, seat1, { flow: steps }, kit);

  t.is(await attempt1, undefined);

  // Check failure evidence
  const failCall = log.find(entry => entry._method === 'fail');
  t.truthy(
    failCall,
    'seat.fail() should be called when noble account creation fails',
  );
  t.deepEqual(
    failCall?.reason,
    Error('timeout creating ICA'),
    'rebalance should fail when noble account creation fails',
  );

  const { getPortfolioStatus } = makeStorageTools(storage);

  // Check portfolio status shows limited accounts (only agoric, no noble due to failure)
  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.true('agoric' in byChain, 'agoric account should be present');
    t.false(
      'noble' in byChain,
      'noble account should not be present due to failure',
    );
  }

  // Recovery attempt - clear the error and use same portfolio
  chainToErr.delete('noble');

  const seat2 = makeMockSeat({ Deposit: amount }, undefined, log);

  await rebalance(orch, ctx, seat2, { flow: steps }, kit);

  const exitCall = log.find(entry => entry._method === 'exit');
  t.truthy(exitCall, 'seat.exit() should be called on successful recovery');

  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.deepEqual(
      Object.keys(byChain),
      ['agoric', 'noble'],
      'portfolio includes noble account',
    );
  }
});

test(
  'handle failure in provideEVMAccount sendMakeAccountCall',
  expectUnhandled(1),
  async t => {
    const unlucky = make(BLD, 13n);
    const { give, steps } = await makePortfolioSteps(
      { Compound: make(USDC, 2_000_000n) },
      {
        fees: { Compound: { Account: unlucky, Call: make(BLD, 100n) } },
        evm: 'Arbitrum',
      },
    );
    const { orch, ctx, offer, storage, tapPK, txResolver } = mocks(
      { send: Error('Insufficient funds - piggy bank sprang a leak') },
      give,
    );
    const { log } = offer;

    // Create portfolio once for both attempts
    const pKit = await ctx.makePortfolioKit();

    // First attempt - will fail when trying to send 13n BLD (unlucky amount)
    const seat1 = makeMockSeat(give, undefined, log);

    const attempt1P = rebalance(orch, ctx, seat1, { flow: steps }, pKit);
    const testDonePK = makePromiseKit();
    void txResolver.settleUntil(testDonePK.promise);
    t.is(await attempt1P, undefined);

    const seatFails = log.find(e => e._method === 'fail' && e._cap === 'seat');
    t.like(
      seatFails?.reason,
      {
        error: 'Insufficient funds - piggy bank sprang a leak',
        how: 'Compound',
        step: 4,
      },
      'rebalance should fail when EVM account creation fails',
    );

    const { getPortfolioStatus, getFlowStatus } = makeStorageTools(storage);

    {
      const { accountIdByChain: byChain, accountsPending } =
        await getPortfolioStatus(1);
      // addresses of all requested accounts are available
      t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric', 'noble']);
      // attempt to install Arbitrum account is no longer pending
      t.deepEqual(accountsPending, []);

      const fs = await getFlowStatus(1, 1);
      t.log(fs);
      t.deepEqual(
        fs,
        {
          type: 'rebalance',
          state: 'fail',
          step: 4,
          how: 'Compound',
          error: 'Insufficient funds - piggy bank sprang a leak',
          next: undefined,
        },
        '"Insufficient funds" error should be visible in vstorage',
      );
    }

    // Recovery attempt - avoid the unlucky 13n fee using same portfolio
    const { give: giveGood, steps: stepsGood } = await makePortfolioSteps(
      { Compound: make(USDC, 2_000_000n) },
      {
        fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } },
      },
    );
    const seat2 = makeMockSeat(giveGood, undefined, log);
    const attempt2P = rebalance(orch, ctx, seat2, { flow: stepsGood }, pKit);

    await Promise.all([
      attempt2P,
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
        await txResolver.drainPending();
      }),
    ]);
    t.truthy(log.find(entry => entry._method === 'exit'));

    {
      const { accountIdByChain: byChain } = await getPortfolioStatus(1);
      t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric', 'noble']);
    }

    testDonePK.resolve(undefined);
  },
);

test.todo('recover from send step');

test('withdraw in coordination with planner', async t => {
  const { orch, ctx, offer, storage, tapPK, txResolver, cosmosId } = mocks({});

  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  {
    const amount = make(USDC, 50_000_000n);
    const seat = makeMockSeat({ Aave: amount }, {}, offer.log);
    const feeAcct = AmountMath.make(BLD, 50n);
    const feeCall = AmountMath.make(BLD, 100n);
    const depositP = rebalance(
      orch,
      ctx,
      seat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
          { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
        ],
      },
      kit,
    );
    await Promise.all([
      depositP,
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
        await txResolver.drainPending();
      }),
    ]);
  }

  const webUiDone = (async () => {
    const Cash = make(USDC, 2_000_000n);
    const wSeat = makeMockSeat({}, { Cash }, offer.log);
    await executePlan(orch, ctx, wSeat, {}, kit, {
      type: 'withdraw',
      amount: Cash,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'withdraw') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);
    const feeCall = AmountMath.make(BLD, 100n);
    const steps: MovementDesc[] = [
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount, fee: feeCall },
      { src: '@Arbitrum', dest: '@agoric', amount },
      { src: '@agoric', dest: '<Cash>', amount },
    ];

    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();
  await Promise.all([webUiDone, plannerP, txResolver.drainPending()]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    // deposit calls
    { _method: 'monitorTransfers' },
    { _method: 'send', _cap: 'agoric11014' }, // from fee account
    { _method: 'transfer' }, // makeAccount
    { _method: 'localTransfer', amounts: { Deposit: { value: 50000000n } } },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer' }, // supply call
    { _method: 'exit' },

    // withdraw calls
    { _method: 'send' },
    {
      _cap: 'agoric11028',
      _method: 'transfer',
      address: { chainId: axelarId },
      amount: { value: 100n },
    },
    { _method: 'send', _cap: 'agoric11014' },
    { _method: 'transfer' }, // depositForBurn
    { _method: 'withdrawToSeat', amounts: { Cash: { value: 2_000_000n } } },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  await documentStorageSchema(t, storage, docOpts);
});

test('deposit in coordination with planner', async t => {
  const { orch, ctx, offer, storage, cosmosId, txResolver } = mocks({});

  const nobleId = await cosmosId('noble');

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  const webUiDone = (async () => {
    const Deposit = make(USDC, 1_000_000n);
    const dSeat = makeMockSeat({ Deposit }, {}, offer.log);
    return executePlan(orch, ctx, dSeat, {}, kit, {
      type: 'deposit',
      amount: Deposit,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'deposit') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);

    const steps = planUSDNDeposit(amount);
    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();

  const [result] = await Promise.all([webUiDone, plannerP]);
  t.log('result', result);
  t.is(result, 'flow1');

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    // deposit calls
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Deposit: { value: 1000000n } } },
    { _method: 'transfer', address: { chainId: nobleId } },
    { msgs: [{ typeUrl: '/noble.swap.v1.MsgSwap' }] },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  await txResolver.drainPending();
  await documentStorageSchema(t, storage, docOpts);
});

test('simple rebalance in coordination with planner', async t => {
  const { orch, ctx, offer, storage, txResolver } = mocks({});

  const { getPortfolioStatus } = makeStorageTools(storage);

  // Create portfolio with initial allocation
  const initialKit = await ctx.makePortfolioKit();
  const portfolioId = initialKit.reader.getPortfolioId();

  // First deposit funds into USDN position
  {
    const depositAmount = make(USDC, 10_000n);
    const depositSeat = makeMockSeat({ Deposit: depositAmount }, {}, offer.log);
    await rebalance(
      orch,
      ctx,
      depositSeat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount: depositAmount },
          { src: '@agoric', dest: '@noble', amount: depositAmount },
          { src: '@noble', dest: 'USDN', amount: depositAmount },
        ],
      },
      initialKit,
    );
  }

  // Set initial allocation (100% USDN in basis points)
  {
    const initialAllocation = { USDN: 10000n }; // 100% = 10000 basis points
    const seat = makeMockSeat({}, {}, offer.log);
    await rebalance(
      orch,
      ctx,
      seat,
      { targetAllocation: initialAllocation },
      initialKit,
    );
  }

  // Now test simpleRebalance flow with different allocation
  const webUiDone = (async () => {
    const newAllocation = { USDN: 5000n, Aave_Arbitrum: 5000n }; // 50% each = 5000 basis points each
    const srSeat = makeMockSeat({}, {}, offer.log);
    initialKit.manager.setTargetAllocation(newAllocation);
    await executePlan(orch, ctx, srSeat, {}, initialKit, { type: 'rebalance' });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'rebalance') throw t.fail(detail.type);

    // Planner provides steps to move from USDN to mixed allocation
    const steps: MovementDesc[] = [
      { src: 'USDN', dest: '@noble', amount: make(USDC, 5_000_000n) },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: make(USDC, 5_000_000n),
        fee: make(BLD, 100n),
      },
      {
        src: '@Arbitrum',
        dest: 'Aave_Arbitrum',
        amount: make(USDC, 5_000_000n),
        fee: make(BLD, 50n),
      },
    ];

    initialKit.planner.resolveFlowPlan(
      Number(flowId.replace('flow', '')),
      steps,
    );
  })();

  // Simulate external system responses for cross-chain operations
  const simulationP = (async () => {
    await txResolver.drainPending();
  })();

  await Promise.all([webUiDone, plannerP, simulationP]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');

  await documentStorageSchema(t, storage, docOpts);
});

test('parallel execution with scheduler', async t => {
  const { orch, ctx, offer, storage, txResolver, cosmosId } = mocks({});

  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');

  const trace = makeTracer('PExec');
  const kit = await ctx.makePortfolioKit();
  await provideCosmosAccount(orch, 'agoric', kit, trace);
  const portfolioId = kit.reader.getPortfolioId();

  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);

  const webUiDone = (async () => {
    const Deposit = make(USDC, 40_000_000n);
    const dSeat = makeMockSeat({ Deposit }, {}, offer.log);

    return executePlan(orch, ctx, dSeat, {}, kit, {
      type: 'deposit',
      amount: Deposit,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);

    if (detail.type !== 'deposit') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);
    const amt60 = make(USDC, (amount.value * 60n) / 100n);
    const amt40 = make(USDC, (amount.value * 40n) / 100n);
    const feeAcct = AmountMath.make(BLD, 50n);
    const steps: MovementDesc[] = [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDN', amount: amt40 },
      { src: '@noble', dest: '@Arbitrum', amount: amt60, fee: feeAcct },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount: amt60 },
    ];

    const plan: FundsFlowPlan = {
      flow: steps,
      order: [
        [1, [0]],
        [2, [1]],
        [3, [1]],
        [4, [3]],
      ],
    };
    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), plan);
  })();

  const resolverP = txResolver.settleUntil(webUiDone);

  // Simulate external system responses for cross-chain operations
  const simulationP = (async () => {
    await offer.factoryPK.promise;
  })();

  const [result] = await Promise.all([
    webUiDone,
    plannerP,
    resolverP,
    simulationP,
  ]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 40_000_000n } },
    },
    { _method: 'transfer', address: { chainId: nobleId } },
    {
      _method: 'executeEncodedTx',
      msgs: [{ typeUrl: '/noble.swap.v1.MsgSwap' }],
    }, // USDN swap (parallel)
    { _method: 'depositForBurn', denomAmount: { value: 24_000_000n } },
    { _method: 'send' },
    { _method: 'transfer' }, // Aave supply call
    { _method: 'exit' },
  ]);

  t.log('result', result);
  t.is(result, 'flow1');

  const flowHistory = {
    [`portfolio${portfolioId}.flows.flow1`]: await getFlowHistory(
      portfolioId,
      1,
    ),
  };
  t.log(flowHistory);
  const parallel = Object.values(flowHistory)[0].flatMap(s =>
    s.state === 'run' && (s.steps || []).length > 1 ? [s] : [],
  );
  t.log('parallel', parallel);
  t.true(parallel.length > 0);

  t.snapshot(flowHistory, 'parallel flow history');
});

/** turn boundaries in provideEVMAccount (except awaiting feeAccount and getChainInfo) */
const ProvideSteps = [
  'predict',
  'send',
  'register',
  'txfr',
  'resolve',
] as const;
type EStep = (typeof ProvideSteps)[number];
const ProvideStepsOrder = Object.fromEntries(
  ProvideSteps.map((s, i) => [s, i]),
) as { [K in EStep]: number };

type ProvideEVMAccountFn = (
  ...args: Parameters<typeof provideEVMAccount>
) => ReturnType<typeof provideEVMAccount>;

const makeProvideEVMAccountWithPermitStub =
  (
    provideEVMWithPermit: typeof provideEVMAccountWithPermit,
  ): ProvideEVMAccountFn =>
  (chainName, chainInfo, gmp, lca, ctx, pk, { orchOpts } = {}) =>
    provideEVMWithPermit(
      chainName,
      chainInfo,
      gmp,
      lca,
      ctx,
      pk,
      {
        permit: {
          permitted: {
            token: '0x0000000000000000000000000000000000000001',
            amount: 1n,
          },
          nonce: 1n,
          deadline: 1n,
        },
        owner: '0x1111111111111111111111111111111111111111',
        witness:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        witnessTypeString: 'OpenPortfolioWitness',
        signature: '0x1234' as `0x${string}`,
      },
      orchOpts,
    );

const provideEVMAccountWithPermitStub = makeProvideEVMAccountWithPermitStub(
  provideEVMAccountWithPermit,
);
const provideEVMRoutedAccountWithPermitStub =
  makeProvideEVMAccountWithPermitStub(provideEVMRoutedAccountWithPermit);

type MakeAccountEVMRaceParams = {
  provide: ProvideEVMAccountFn;
  provideB?: ProvideEVMAccountFn;
  headStart: EStep;
  errAt?: Exclude<EStep, 'predict' | 'register'>;
  BHasDeposit?: boolean;
};

/**
 * make 2 attempts A, and B, to provideEVMAccount.
 * Give A a headStart and then pause it.
 * Optionally, fail A at some step.
 * If A succeeds, B should re-use its result.
 * Otherwise, B should succeed after recovering.
 */
const makeAccountEVMRace = test.macro({
  title: (providedTitle = '', _params: MakeAccountEVMRaceParams) =>
    `EVM makeAccount race: ${providedTitle}`,
  async exec(
    t,
    {
      provide,
      provideB,
      headStart,
      errAt,
      BHasDeposit,
    }: MakeAccountEVMRaceParams,
  ) {
    const {
      orch,
      ctx,
      offer,
      txResolver,
      resolverService,
      makeProgressTracker,
    } = mocks({});

    const pKit = await ctx.makePortfolioKit();
    await provideCosmosAccount(orch, 'agoric', pKit, silent);
    const lca = pKit.reader.getLocalAccount();

    const chainName = 'Arbitrum';
    const { [chainName]: chainInfo } = axelarCCTPConfig;
    const gmp = { chain: await orch.getChain('axelar'), fee: 123n };

    const attempt = (p: ProvideEVMAccountFn = provide) => {
      const progressTracker = makeProgressTracker();
      const info = p(chainName, chainInfo, gmp, lca, ctx, pKit, {
        orchOpts: { progressTracker },
      });
      return { info, progressTracker };
    };

    const { log, kinks } = offer;
    type Kink = typeof kinks extends Set<infer U> ? U : never;
    const { info: Ap, progressTracker: AProgressTracker } = attempt();

    const resolveAfterBStarts: ((r: unknown) => void)[] = [];
    const removeKink = (kink: Kink) => {
      const removed = kinks.delete(kink);
      if (!removed) throw Error('kink not found');
      t.log('removed kink', kink.name);
    };
    const waitDuring = (method: string) => {
      const sync = makePromiseKit();
      resolveAfterBStarts.push(sync.resolve);
      const waitKink: Kink = async ev => {
        if (ev._method === method) {
          removeKink(waitKink);
          t.log('wait for B before:', method);
          await sync.promise;
        }
      };
      kinks.add(waitKink);
    };
    const failedMethods: string[] = [];
    const failDuring = (method: string, msg = 'no joy') => {
      const failKink: Kink = async ev => {
        if (ev._method === method) {
          t.log('fail in A during:', method);
          failedMethods.push(method);
          removeKink(failKink);
          throw Error(msg);
        }
      };
      kinks.add(failKink);
    };

    const startSettlingPK = makePromiseKit();
    const doSettle = async () => {
      await startSettlingPK.promise;
      t.log('settle A txs');
      const [txStatus, txReason] =
        errAt === 'resolve'
          ? (['failed', 'oops!'] as const)
          : (['success', undefined] as const);

      const txIds = AProgressTracker.getCurrentProgressReport().appendedTxIds;
      for (const txId of txIds) {
        const tx = txResolver.getPublished(txId);
        if (tx?.status === 'pending') {
          resolverService.settleTransaction({
            txId,
            status: txStatus,
            rejectionReason: txReason,
          });
        }
      }
    };

    const settleKink: Kink = async ev => {
      if (ev._method === 'transfer') {
        removeKink(settleKink);
        void doSettle();
      }
    };

    const ASettledAt = errAt ?? 'resolve';
    const BOverlapsA =
      ProvideStepsOrder[headStart] < ProvideStepsOrder[ASettledAt];

    if (ASettledAt === 'resolve') {
      kinks.add(settleKink);
    }

    if (BOverlapsA && BHasDeposit) {
      throw new Error(
        'Invalid test configuration: B cannot have a deposit if it overlaps with A',
      );
    }

    switch (headStart) {
      case 'predict': {
        waitDuring('send');
        resolveAfterBStarts.push(startSettlingPK.resolve);
        break;
      }

      case 'send': {
        waitDuring('transfer');
        resolveAfterBStarts.push(startSettlingPK.resolve);
        break;
      }

      case 'register': {
        waitDuring('transfer');
        resolveAfterBStarts.push(startSettlingPK.resolve);
        break;
      }

      case 'txfr':
        resolveAfterBStarts.push(startSettlingPK.resolve);
        break;

      case 'resolve': {
        void eventLoopIteration().then(() => {
          startSettlingPK.resolve(null);
        });
        break;
      }

      default:
        throw Error('unreachable');
    }

    switch (errAt) {
      case 'send': {
        failDuring('send', 'insufficient funds: need moar!');
        break;
      }
      case 'txfr': {
        failDuring('transfer', 'timeout: coach is not happy');
        break;
      }
      case 'resolve': {
        // handled by doSettle
        break;
      }
      case undefined:
        break;
      default:
        throw Error(`unexpected errAt value: ${errAt}`);
    }

    const A = await Ap;
    const { remoteAddress } = A;
    t.log('promptly available address', remoteAddress);

    await eventLoopIteration(); // A runs until paused
    const getMethods = () => log.map(msg => msg._method);
    const methodsBeforeB = getMethods();
    t.log('calls before B:', methodsBeforeB.join(', '));

    const { info: Bp, progressTracker: BProgressTracker } = attempt(provideB);

    for (const resolve of resolveAfterBStarts) {
      resolve(null);
    }

    const B = await Bp;
    t.is(B.remoteAddress, remoteAddress, 'same address for both racers');

    const AErr = await (errAt
      ? t.throwsAsync(A.ready)
      : t.notThrowsAsync(A.ready));
    t.snapshot(
      { methodsBeforeB, failedMethods },
      JSON.stringify({ headStart, errAt, BHasDeposit, BOverlapsA }),
    );

    t.log('calls after A:', getMethods().join(', '));

    // If A fails:
    // - overlap should expect failure of B
    // - no overlap should expect recovery
    // NB: deposit in B is not expected and disallowed by test config if there is overlap.

    if (BOverlapsA && errAt) {
      const BErr = await t.throwsAsync(B.ready);
      t.is(BErr, AErr as Error);
      t.not(
        pKit.reader.getGMPInfo(chainName).err,
        undefined,
        'account is failed',
      );
    } else {
      await eventLoopIteration(); // B runs until any resolve;

      const BShouldRecover = !!errAt;
      const BHasWorkToDo = BHasDeposit || BShouldRecover;
      const readyRaceResult = Promise.race([
        B.ready.then(() => false),
        Promise.resolve().then(() => true),
      ]);
      await t.notThrowsAsync(readyRaceResult);

      t.is(
        await readyRaceResult,
        BShouldRecover,
        'B should be ready immediately iif it does not have to recover',
      );

      if (!BHasWorkToDo) {
        // XXX: can we assert somehow that B doesn't do any work if there is an overlap?
        if (!BOverlapsA) {
          t.deepEqual(
            methodsBeforeB,
            getMethods(),
            'B should do no work if not a deposit and A succeeded',
          );
        }
      } else {
        t.log('settle B txs');
        await eventLoopIteration();
        const txIds = BProgressTracker.getCurrentProgressReport().appendedTxIds;
        for (const txId of txIds) {
          const tx = txResolver.getPublished(txId);
          if (tx?.status === 'pending') {
            resolverService.settleTransaction({
              txId,
              status: 'success',
            });
          }
        }

        await t.notThrowsAsync(Promise.all([B.ready, B.done]));
      }

      t.is(pKit.reader.getGMPInfo(chainName).err, undefined, 'account is ok');
    }

    t.log('calls after A,B:', getMethods().join(', '));
    t.snapshot(getMethods(), 'total sequence of completed methods');
  },
});

test('A and B arrive together; A wins the race; B adopts', makeAccountEVMRace, {
  provide: provideEVMAccount,
  headStart: 'predict',
});
test('A pays fee; B adopts', makeAccountEVMRace, {
  provide: provideEVMAccount,
  headStart: 'send',
});
test(
  'A fails to pay fee; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMAccount,
    headStart: 'send',
    errAt: 'send',
  },
);
test('A registers txN; B adopts', makeAccountEVMRace, {
  provide: provideEVMAccount,
  headStart: 'register',
});
test('A transfers to axelar; B adopts', makeAccountEVMRace, {
  provide: provideEVMAccount,
  headStart: 'txfr',
});
test(
  'A times out on axelar; B adopts',
  expectUnhandled(1, makeAccountEVMRace),
  { provide: provideEVMAccount, headStart: 'register', errAt: 'txfr' },
);
test(
  'A times out on axelar; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  { provide: provideEVMAccount, headStart: 'txfr', errAt: 'txfr' },
);
test('A gets rejected txN; B adopts', expectUnhandled(1, makeAccountEVMRace), {
  provide: provideEVMAccount,
  headStart: 'txfr',
  errAt: 'resolve',
});
test(
  'A gets rejected txN; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMAccount,
    headStart: 'resolve',
    errAt: 'resolve',
  },
);
test('A finishes before attempt B starts', makeAccountEVMRace, {
  provide: provideEVMAccount,
  headStart: 'resolve',
});

test(
  'withPermit: A and B arrive together; A wins the race; B adopts',
  makeAccountEVMRace,
  {
    provide: provideEVMAccountWithPermitStub,
    provideB: provideEVMAccount,
    headStart: 'predict',
  },
);
test('withPermit: A registers txN; B adopts', makeAccountEVMRace, {
  provide: provideEVMAccountWithPermitStub,
  provideB: provideEVMAccount,
  headStart: 'register',
});
test('withPermit: A transfers to axelar; B adopts', makeAccountEVMRace, {
  provide: provideEVMAccountWithPermitStub,
  provideB: provideEVMAccount,
  headStart: 'txfr',
});
test(
  'withPermit: A times out on axelar; B adopts',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMAccountWithPermitStub,
    provideB: provideEVMAccount,
    headStart: 'register',
    errAt: 'txfr',
  },
);
test(
  'withPermit: A times out on axelar; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMAccountWithPermitStub,
    headStart: 'txfr',
    errAt: 'txfr',
    BHasDeposit: true,
  },
);
test(
  'withPermit: A gets rejected txN; B adopts',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMAccountWithPermitStub,
    provideB: provideEVMAccount,
    headStart: 'txfr',
    errAt: 'resolve',
  },
);
test(
  'withPermit: A gets rejected txN; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMAccountWithPermitStub,
    headStart: 'resolve',
    errAt: 'resolve',
    BHasDeposit: true,
  },
);
test('withPermit: A finishes before attempt B starts', makeAccountEVMRace, {
  provide: provideEVMAccountWithPermitStub,
  headStart: 'resolve',
  BHasDeposit: true,
});

test(
  'routed: A and B arrive together; A wins the race; B adopts',
  makeAccountEVMRace,
  {
    provide: provideEVMRoutedAccount,
    headStart: 'predict',
  },
);
test('routed: A pays fee; B adopts', makeAccountEVMRace, {
  provide: provideEVMRoutedAccount,
  headStart: 'send',
});
test(
  'routed: A fails to pay fee; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMRoutedAccount,
    headStart: 'send',
    errAt: 'send',
  },
);
test('routed: A registers txN; B adopts', makeAccountEVMRace, {
  provide: provideEVMRoutedAccount,
  headStart: 'register',
});
test('routed: A transfers to axelar; B adopts', makeAccountEVMRace, {
  provide: provideEVMRoutedAccount,
  headStart: 'txfr',
});
test(
  'routed: A times out on axelar; B adopts',
  expectUnhandled(1, makeAccountEVMRace),
  { provide: provideEVMRoutedAccount, headStart: 'register', errAt: 'txfr' },
);
test(
  'routed: A times out on axelar; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  { provide: provideEVMRoutedAccount, headStart: 'txfr', errAt: 'txfr' },
);
test(
  'routed: A gets rejected txN; B adopts',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMRoutedAccount,
    headStart: 'txfr',
    errAt: 'resolve',
  },
);
test(
  'routed: A gets rejected txN; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMRoutedAccount,
    headStart: 'resolve',
    errAt: 'resolve',
  },
);
test('routed: A finishes before attempt B starts', makeAccountEVMRace, {
  provide: provideEVMRoutedAccount,
  headStart: 'resolve',
});

test(
  'routed: withPermit: A and B arrive together; A wins the race; B adopts',
  makeAccountEVMRace,
  {
    provide: provideEVMRoutedAccountWithPermitStub,
    provideB: provideEVMRoutedAccount,
    headStart: 'predict',
  },
);
test('routed: withPermit: A registers txN; B adopts', makeAccountEVMRace, {
  provide: provideEVMRoutedAccountWithPermitStub,
  provideB: provideEVMRoutedAccount,
  headStart: 'register',
});
test(
  'routed: withPermit: A transfers to axelar; B adopts',
  makeAccountEVMRace,
  {
    provide: provideEVMRoutedAccountWithPermitStub,
    provideB: provideEVMRoutedAccount,
    headStart: 'txfr',
  },
);
test(
  'routed: withPermit: A times out on axelar; B adopts',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMRoutedAccountWithPermitStub,
    provideB: provideEVMRoutedAccount,
    headStart: 'register',
    errAt: 'txfr',
  },
);
test(
  'routed: withPermit: A times out on axelar; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMRoutedAccountWithPermitStub,
    headStart: 'txfr',
    errAt: 'txfr',
    BHasDeposit: true,
  },
);
test(
  'routed: withPermit: A gets rejected txN; B adopts',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMRoutedAccountWithPermitStub,
    provideB: provideEVMRoutedAccount,
    headStart: 'txfr',
    errAt: 'resolve',
  },
);
test(
  'routed: withPermit: A gets rejected txN; B arrives and recovers',
  expectUnhandled(1, makeAccountEVMRace),
  {
    provide: provideEVMRoutedAccountWithPermitStub,
    headStart: 'resolve',
    errAt: 'resolve',
    BHasDeposit: true,
  },
);
test(
  'routed: withPermit: A finishes before attempt B starts',
  makeAccountEVMRace,
  {
    provide: provideEVMRoutedAccountWithPermitStub,
    headStart: 'resolve',
    BHasDeposit: true,
  },
);

const provideFailsOnIncompatibleAccount = test.macro({
  title: (providedTitle = '') =>
    `EVM makeAccount with incompatible existing account: ${providedTitle}`,
  async exec(t, provide: ProvideEVMAccountFn, withRouter: boolean) {
    const { orch, ctx, makeProgressTracker } = mocks({});

    const pKit = await ctx.makePortfolioKit();
    await provideCosmosAccount(orch, 'agoric', pKit, silent);
    const lca = pKit.reader.getLocalAccount();

    const chainName = 'Arbitrum';
    const { [chainName]: chainInfo } = axelarCCTPConfig;
    const gmp = { chain: await orch.getChain('axelar'), fee: 123n };

    pKit.manager.resolveAccount({
      chainName,
      namespace: 'eip155',
      chainId: `eip155:${chainInfo.reference}`,
      remoteAddress: '0xExistingIncompatibleAccount',
      ...(withRouter ? { routerFactory: '0xRouterFactoryAddress' } : {}),
    });

    const progressTracker = makeProgressTracker();

    t.throws(() =>
      provide(chainName, chainInfo, gmp, lca, ctx, pKit, {
        orchOpts: { progressTracker },
      }),
    );
  },
});

test(
  'router account with legacy provide',
  provideFailsOnIncompatibleAccount,
  provideEVMAccount,
  true,
);
test(
  'router account with legacy provideWithPermit',
  provideFailsOnIncompatibleAccount,
  provideEVMAccountWithPermitStub,
  true,
);

test(
  'legacy account with routed provide',
  provideFailsOnIncompatibleAccount,
  provideEVMRoutedAccount,
  false,
);
test(
  'legacy account with routed provideWithPermit',
  provideFailsOnIncompatibleAccount,
  provideEVMRoutedAccountWithPermitStub,
  false,
);

test('planner rejects plan and flow fails gracefully', async t => {
  const { orch, ctx, offer, storage } = mocks({});

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  // Set up portfolio with initial allocation
  kit.manager.setTargetAllocation({ USDN: 10000n }); // 100% USDN

  const webUiDone = (async () => {
    const Cash = make(USDC, 1_000_000n);
    const dSeat = makeMockSeat({}, { Cash }, offer.log);

    // This should fail when planner rejects the plan
    await t.throwsAsync(
      () =>
        executePlan(orch, ctx, dSeat, {}, kit, {
          type: 'withdraw',
          amount: Cash,
        }),
      { message: 'insufficient funds for this operation' },
    );
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found running flow', { portfolioId, flowId, detail });

    if (detail.type !== 'withdraw')
      throw t.fail(`Expected withdraw, got ${detail.type}`);

    // Planner rejects the plan due to insufficient funds
    const flowIdNum = Number(flowId.replace('flow', ''));

    kit.planner.rejectFlowPlan(
      flowIdNum,
      'insufficient funds for this operation',
    );
  })();

  await Promise.all([webUiDone, plannerP]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));

  // Verify the seat failed rather than exited successfully
  const seatCalls = log.filter(entry => entry._cap === 'seat');
  const failCall = seatCalls.find(call => call._method === 'fail');
  const exitCall = seatCalls.find(call => call._method === 'exit');

  t.truthy(failCall, 'seat.fail() should be called when plan is rejected');
  t.falsy(exitCall, 'seat.exit() should not be called when plan is rejected');
  t.is(
    `${failCall?.reason}`,
    'Error: insufficient funds for this operation',
    'failure reason should match rejection message',
  );

  // Verify flow is cleaned up from running flows
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after rejection');

  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});

test('failed transaction publishes rejectionReason to vstorage', async t => {
  const { storage, resolverClient, resolverService, vowTools } = mocks({});

  const { result, txId } = resolverClient.registerTransaction(
    'GMP',
    'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
  );
  await eventLoopIteration();

  const rejectionReason = 'remote account does not have enough USDC';

  // Settle the transaction as failed with a rejection reason
  resolverService.settleTransaction({
    txId,
    status: 'failed',
    rejectionReason,
  });
  await eventLoopIteration();

  // Verify the vow is rejected with the correct reason
  await t.throwsAsync(() => vowTools.when(result), {
    message: rejectionReason,
  });
  await documentStorageSchema(t, storage, docOpts);
});

test('CCTP from EVM waits for source wallet readiness before sending GMP call', async t => {
  const { orch, ctx, offer, txResolver, cosmosId } = mocks({});
  const { log } = offer;
  const kit = await ctx.makePortfolioKit();
  const amount = make(USDC, 2_000_000n);
  const fee = AmountMath.make(BLD, 100n);
  const seat = makeMockSeat({}, {}, log);
  const axelarId = await cosmosId('axelar');

  const flowP = rebalance(
    orch,
    ctx,
    seat,
    {
      flow: [{ src: '@Base', dest: '@agoric', amount, fee }],
    },
    kit,
  );

  await eventLoopIteration();
  const transfersToAxelar = log.filter(
    (entry: any) =>
      entry._method === 'transfer' && entry.address?.chainId === axelarId,
  );
  t.is(
    transfersToAxelar.length,
    1,
    'only makeAccount GMP transfer should be sent before wallet is ready',
  );

  await txResolver.drainPending();
  await flowP;
});

test('asking to relay less than 1 USDC over CCTP is refused by contract', async t => {
  const amount = make(USDC, 250_000n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const feeAcct = AmountMath.make(BLD, 150n);
  const feeCall = AmountMath.make(BLD, 100n);
  const steps: MovementDesc[] = [
    { src: '<Deposit>', dest: '@agoric', amount },
    { src: '@agoric', dest: '@noble', amount },
    { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
    { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
  ];

  const nobleId = await cosmosId('noble');

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, { flow: steps }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer' },
    { _method: 'send' },
    { _method: 'transfer' },
    { _method: 'localTransfer' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'fail' },
  ]);

  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('makeErrorList collects any number of errors', t => {
  {
    const fromNoRejections = makeErrorList(
      [{ status: 'fulfilled', value: undefined }],
      [],
    );
    t.is(fromNoRejections, undefined, 'no errors');
  }

  {
    const fromOneRejection = makeErrorList(
      [
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('insufficient funds') },
      ],
      [{ how: 'IBC' }, { how: 'Aave' }],
    );
    t.log('single error', fromOneRejection);
    t.deepEqual(
      fromOneRejection,
      {
        error: 'insufficient funds',
        how: 'Aave',
        next: undefined,
        step: 2,
      },
      'single error',
    );
  }

  {
    const fromSeveralRejections = makeErrorList(
      [
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('insufficient funds') },
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('no route') },
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('prereq 4 failed') },
      ],
      [
        { how: 'IBC' },
        { how: 'Aave' },
        { how: 'send' },
        { how: 'pidgeon' },
        { how: 'IBC' },
        { how: 'Compound' },
      ],
    );
    t.log('several errors', fromSeveralRejections);
    t.deepEqual(
      fromSeveralRejections,
      {
        error: 'insufficient funds',
        how: 'Aave',
        next: {
          error: 'no route',
          how: 'pidgeon',
          next: {
            error: 'prereq 4 failed',
            how: 'Compound',
            next: undefined,
            step: 6,
          },
          step: 4,
        },
        step: 2,
      },
      'several errors',
    );
  }
});

test('open portfolio with ERC4626 position', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        {
          src: '@Arbitrum',
          dest: 'ERC4626_vaultU2_Ethereum',
          amount,
          fee: feeCall,
        },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: 'noble-1' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 1_000_000n } },
    },
    { _method: 'transfer', address: { chainId: 'noble-1' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'exit', _cap: 'seat' },
  ]);

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);

  const rawMemo = log[8].opts!.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'approve(address,uint256)',
    'deposit(uint256,address)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');
});

test('withdraw from ERC4626 position', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

  const kit = await ctx.makePortfolioKit();
  const emptyAmount = AmountMath.make(USDC, 0n);

  await Promise.all([
    rebalance(
      orch,
      ctx,
      offer.seat,
      {
        flow: [
          {
            dest: '@Arbitrum',
            src: 'ERC4626_vaultU2_Ethereum',
            amount: emptyAmount,
            fee: feeCall,
          },
        ],
      },
      kit,
    ),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);

  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log');

  const rawMemo = log[4].opts!.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'withdraw(uint256,address,address)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');

  await documentStorageSchema(t, storage, docOpts);
});

test('withdraw from Beefy position', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

  const kit = await ctx.makePortfolioKit();

  await Promise.all([
    rebalance(
      orch,
      ctx,
      offer.seat,
      {
        flow: [
          {
            dest: '@Arbitrum',
            src: 'Beefy_re7_Avalanche',
            amount,
            fee: feeCall,
          },
        ],
      },
      kit,
    ),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);

  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log');

  const rawMemo = log[4].opts!.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'approve(address,uint256)',
    'beefyWithdrawUSDC(address,uint256)',
    'approve(address,uint256)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');

  await documentStorageSchema(t, storage, docOpts);
});

// EVM wallet integration flow
test('openPortfolio from EVM with Permit2 completes a deposit flow', async t => {
  // Use a mixed-case spender to ensure case-insensitive address checks.
  const mixedCaseSpender =
    contractsMock.Arbitrum.depositFactory.toUpperCase() as Address;
  const permitDetails: PermitDetails = {
    chainId: BigInt(axelarCCTPConfig.Arbitrum.reference),
    token: contractsMock.Arbitrum.usdc,
    amount: 1_000_000_000n,
    spender: mixedCaseSpender,
    permit2Payload: {
      permit: {
        deadline: 1357923600n,
        nonce: 7115368379195441n,
        permitted: {
          amount: 1_000_000_000n,
          token: contractsMock.Arbitrum.usdc,
        },
      },
      owner: '0x1111111111111111111111111111111111111111',
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234' as `0x${string}`,
    },
  };
  const amount = make(USDC, permitDetails.amount);
  const targetAllocation = {
    Aave_Arbitrum: 6000n, // 60% in basis points
    Compound_Arbitrum: 4000n, // 40% in basis points
  };

  const { orch, ctx, offer, cosmosId, storage, txResolver } = mocks();
  const { log, seat } = offer;
  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);
  let flowNum: number | undefined;

  const webUiDone = openPortfolio(
    orch,
    ctx,
    seat,
    { targetAllocation },
    kit,
    {
      features: {
        useProgressTracker: true,
      },
    },
    { fromChain: 'Arbitrum', permitDetails, amount },
  );

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    flowNum = Number(flowId.replace('flow', ''));
    const fee = make(BLD, 100n);
    const fromChain = detail.fromChain as AxelarChain;
    const steps: MovementDesc[] = [
      { src: `+${fromChain}`, dest: `@${fromChain}`, amount, fee },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);

    // Complete GMP transaction
    await txResolver.drainPending();
  })();

  await Promise.all([webUiDone, plannerP, offer.factoryPK.promise]);

  await eventLoopIteration();
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
  if (flowNum === undefined) {
    throw new Error('flow number not captured');
  }
  const flowHistory = await getFlowHistory(portfolioId, flowNum);
  t.is(flowHistory.at(-1)?.state, 'done');

  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');
  const setupCalls = [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
  ];
  const gmpCalls = [{ _method: 'transfer', address: { chainId: axelarId } }];
  t.like(log, [...setupCalls, ...gmpCalls, { _method: 'exit', _cap: 'seat' }]);
  t.snapshot(log, 'call log');

  const axelarTransfer = log.find(
    (e: any) => e._method === 'transfer' && e.address?.chainId === axelarId,
  );
  const rawMemo = axelarTransfer?.opts?.memo;
  t.truthy(rawMemo);
  const decodedPayload = decodeCreateAndDepositPayload(rawMemo as string);
  const lca = kit.reader.getLocalAccount();
  t.is(decodedPayload.lcaOwner, lca.getAddress().value);
  t.is(
    decodedPayload.tokenOwner.toLowerCase(),
    permitDetails.permit2Payload.owner.toLowerCase(),
  );
  t.is(
    decodedPayload.permit.permitted.token,
    permitDetails.permit2Payload.permit.permitted.token,
  );
  t.is(
    decodedPayload.permit.permitted.amount,
    permitDetails.permit2Payload.permit.permitted.amount,
  );
  t.is(decodedPayload.permit.nonce, permitDetails.permit2Payload.permit.nonce);
  t.is(
    decodedPayload.permit.deadline,
    permitDetails.permit2Payload.permit.deadline,
  );
  t.is(decodedPayload.signature, permitDetails.permit2Payload.signature);

  t.snapshot(decodedPayload, 'decoded payload');
});

test.todo(
  'openPortfolio from EVM with Permit2 retries when sendCreateAndDepositCall/Factory.execute fails',
);

test.todo(
  'openPortfolio from EVM with Permit2 handles subsequent deposits without skipping +Base -> @Base',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects permit with unexpected token for fromChain',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects deposit for unsupported chain',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects deposit with wrong spender',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects permit with zero amount',
);

// #region wayFromSrcToDest withdraw tests

test('wayFromSrcToDest handles @Arbitrum -> -Arbitrum (same-chain withdraw)', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const actual = wayFromSrcToDest({
    src: '@Arbitrum',
    dest: '-Arbitrum',
    amount,
  });
  t.deepEqual(actual, { how: 'withdrawToEVM', dest: 'Arbitrum' });
});

test('wayFromSrcToDest handles @noble -> -Arbitrum (CCTP to user)', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const actual = wayFromSrcToDest({ src: '@noble', dest: '-Arbitrum', amount });
  t.deepEqual(actual, { how: 'CCTPtoUser', dest: 'Arbitrum' });
});

test('wayFromSrcToDest rejects @agoric -> -Arbitrum (invalid src for withdraw)', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  t.throws(
    () => wayFromSrcToDest({ src: '@agoric', dest: '-Arbitrum', amount }),
    { message: /src for withdraw to "Arbitrum" must be same chain or noble/ },
  );
});

// #endregion

// #region evmHandler.rebalance tests

// XXX: These tests should exercise the flows directly without evmHandler
//      `portfolio.exos.test.ts` should test that executePlan gets called

test('evmHandler.rebalance completes a rebalance flow', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const fee = AmountMath.make(BLD, 100n);

  // Valid checksummed Ethereum address (42161 is Arbitrum chain ID)
  const sourceAccountId =
    'eip155:42161:0x1234567890AbcdEF1234567890aBcdef12345678';

  const { ctx, offer, storage, txResolver } = mocks({}, {});
  const { log } = offer;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);
  let flowNum: number | undefined;

  // Invoke rebalance via evmHandler with target allocation
  const allocations = [
    { instrument: 'Aave_Arbitrum', portion: 60n },
    { instrument: 'Compound_Arbitrum', portion: 40n },
  ];
  const flowKey = kit.evmHandler.rebalance(allocations);
  t.regex(flowKey, /^flow\d+$/);

  // Planner provides a rebalance plan
  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    if (detail.type !== 'rebalance')
      throw t.fail(`expected rebalance, got ${detail.type}`);
    flowNum = Number(flowId.replace('flow', ''));

    // Simple rebalance: move from one position to another
    const steps: MovementDesc[] = [
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount, fee },
      { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount, fee },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);
    await txResolver.drainPending();
  })();

  await plannerP;
  await eventLoopIteration();

  t.log(log.map(msg => msg._method).join(', '));

  // Verify the flow completed and was cleaned up
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
  if (flowNum === undefined) throw new Error('flow number not captured');
  const flowHistory = await getFlowHistory(portfolioId, flowNum);
  t.is(flowHistory.at(-1)?.state, 'done');
});

test('evmHandler.rebalance rejects when sourceAccountId is not set', async t => {
  const { ctx } = mocks({}, {});

  // Create kit WITHOUT sourceAccountId
  const kit = await ctx.makePortfolioKit();

  t.throws(
    () =>
      kit.evmHandler.rebalance([
        { instrument: 'Aave_Arbitrum', portion: 100n },
      ]),
    { message: /rebalance requires sourceAccountId to be set/ },
  );
});

// #endregion evmHandler.rebalance tests

// #region evmHandler.withdraw step execution tests

// XXX: These tests should exercise the flows directly without evmHandler
//      portfolio.exos.test.ts should test that executePlan gets called

test('evmHandler.withdraw via CCTPtoUser sends depositForBurn to user address', async t => {
  const withdrawAmount = 2_000_000n;
  const amount = AmountMath.make(USDC, withdrawAmount);

  // Valid checksummed Ethereum address (42161 is Arbitrum chain ID)
  const sourceAccountId =
    'eip155:42161:0x1234567890AbcdEF1234567890aBcdef12345678';

  const { ctx, offer, storage, txResolver } = mocks({}, {});
  const { log } = offer;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus } = makeStorageTools(storage);

  // Invoke withdraw via evmHandler
  const flowKey = kit.evmHandler.withdraw({
    withdrawDetails: {
      amount: withdrawAmount,
      token: contractsMock.Arbitrum.usdc,
    },
    domain: { chainId: 42161n },
  });
  t.regex(flowKey, /^flow\d+$/);

  // Planner provides a CCTPtoUser step (funds routed through Noble)
  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));

    const steps: MovementDesc[] = [
      { src: '@noble', dest: '-Arbitrum', amount },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);
    await txResolver.drainPending();
  })();

  await plannerP;
  await eventLoopIteration();

  t.log(log.map(msg => msg._method).join(', '));

  // Verify depositForBurn was called with user's address
  const depositForBurnCall = log.find(
    (entry: any) => entry._method === 'depositForBurn',
  );
  t.truthy(depositForBurnCall, 'depositForBurn should be called');
  t.is(
    depositForBurnCall?.destinationAddress,
    sourceAccountId,
    'destination should be user address from sourceAccountId',
  );

  t.like(log, [{ _method: 'monitorTransfers' }, { _method: 'depositForBurn' }]);

  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});

test('evmHandler.withdraw via GMP sends ERC20 transfer to user address', async t => {
  const withdrawAmount = 2_000_000n;
  const amount = AmountMath.make(USDC, withdrawAmount);
  const fee = AmountMath.make(BLD, 100n);

  // Valid checksummed Ethereum address (42161 is Arbitrum chain ID)
  const sourceAccountId =
    'eip155:42161:0x1234567890AbcdEF1234567890aBcdef12345678';

  const { ctx, offer, storage, txResolver, cosmosId } = mocks({}, {});
  const { log } = offer;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);
  let flowNum: number | undefined;

  // Invoke withdraw via evmHandler
  const flowKey = kit.evmHandler.withdraw({
    withdrawDetails: {
      amount: withdrawAmount,
      token: contractsMock.Arbitrum.usdc,
    },
    domain: { chainId: 42161n },
  });
  t.regex(flowKey, /^flow\d+$/);

  // Planner provides a GMP withdrawToEVM step (same-chain withdraw)
  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    if (detail.type !== 'withdraw')
      throw t.fail(`expected withdraw, got ${detail.type}`);
    flowNum = Number(flowId.replace('flow', ''));
    t.is(detail.toChain, 'Arbitrum', 'toChain should be Arbitrum');
    t.deepEqual(detail.amount, amount, 'amount should match');

    const steps: MovementDesc[] = [
      { src: '@Arbitrum', dest: '-Arbitrum', amount, fee },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);
    await txResolver.drainPending();
  })();

  await plannerP;
  await eventLoopIteration();

  t.log(log.map(msg => msg._method).join(', '));

  // Should have GMP transfers for the ERC20 transfer call
  const axelarId = await cosmosId('axelar');
  const gmpTransfers = log.filter(
    (entry: any) =>
      entry._method === 'transfer' && entry.address?.chainId === axelarId,
  );
  t.true(
    gmpTransfers.length > 0,
    'GMP transfer should be made for withdrawToEVM',
  );

  // Verify the flow completes successfully (no fail call)
  const failCall = log.find((entry: any) => entry._method === 'fail');
  t.falsy(failCall, 'seat should not fail');

  // Verify the flow completed and was cleaned up
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
  if (flowNum === undefined) throw new Error('flow number not captured');
  const flowHistory = await getFlowHistory(portfolioId, flowNum);
  t.is(flowHistory.at(-1)?.state, 'done');

  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});

test('evmHandler.withdraw rejects when sourceAccountId is not set', async t => {
  const { ctx } = mocks({}, {});

  // Create kit WITHOUT sourceAccountId
  const kit = await ctx.makePortfolioKit();

  t.throws(
    () =>
      kit.evmHandler.withdraw({
        withdrawDetails: {
          amount: 2_000_000n,
          token: contractsMock.Arbitrum.usdc,
        },
        domain: { chainId: 42161n },
      }),
    { message: /withdraw requires sourceAccountId to be set/ },
  );
});

// #endregion evmHandler.withdraw tests

// #region evmHandler.deposit tests

/**
 * Execute an EVM Permit2 deposit flow and wait for completion.
 */
const doDeposit = async ({
  t,
  kit,
  storage,
  txResolver,
  permitDetails,
  orch,
  ctx,
  expectedFlowOutcome = 'done',
}: Pick<Mocks, 'txResolver' | 'storage'> & {
  t: Assertions;
  kit: GuestInterface<PortfolioKit>;
  orch: Orchestrator;
  ctx: PortfolioInstanceContext;
  permitDetails: PermitDetails;
  expectedFlowOutcome?: 'done' | 'fail';
}) => {
  const fromChain = 'Arbitrum';
  // XXX: Support arbistrary chain
  assert(`${permitDetails.chainId}` === axelarCCTPConfig[fromChain].reference);

  const amount = AmountMath.make(USDC, permitDetails.amount);
  const flowDetail: FlowDetail = { type: 'deposit', amount, fromChain };
  const startedFlow = kit.manager.startFlow(flowDetail);
  const seat = makeMockSeat({}, {}, []);

  void executePlan(
    orch,
    ctx,
    seat,
    {},
    kit,
    flowDetail,
    startedFlow,
    undefined,
    { evmDepositDetail: { ...permitDetails, fromChain } },
  ).catch(() => {}); // check outcome through flowStatus

  const flowNum = startedFlow.flowId;
  const portfolioId = kit.reader.getPortfolioId();
  const { getFlowStatus } = makeStorageTools(storage);

  const fee = make(BLD, 100n);
  const steps: MovementDesc[] = [
    {
      src: `+${fromChain}`,
      dest: `@${fromChain}`,
      amount,
      fee,
    },
  ];
  kit.planner.resolveFlowPlan(flowNum, steps);
  await txResolver.drainPending();
  await eventLoopIteration();

  const flowStatus = await getFlowStatus(portfolioId, flowNum);
  t.is(flowStatus?.state, expectedFlowOutcome);
};

test('evmHandler.deposit via Permit2 with unknown spender is rejected', async t => {
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const existingWallet =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
  const permitDetails = makePermitDetails({
    spender: '0x0000000000000000000000000000000000009999' as Address,
  });
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);

  assert(
    axelarCCTPConfig.Arbitrum.reference === `${permitDetails.chainId}`,
    'chainId should match axelarCCTPConfig',
  );
  kit.manager.resolveAccount({
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: `eip155:${permitDetails.chainId}`,
    remoteAddress: existingWallet,
  });

  const { accountIdByChain: byChain } = await getPortfolioStatus(
    kit.reader.getPortfolioId(),
  );
  // agoric and Arbitrum account have been pre-created
  t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric']);

  await doDeposit({
    t,
    kit,
    orch,
    ctx,
    storage,
    txResolver,
    permitDetails,
    expectedFlowOutcome: 'fail',
  });

  await documentStorageSchema(t, storage, docOpts);
});

/**
 * This test uses the depositFactory contract as the spender address.
 */
test('evmHandler.deposit via Permit2 to missing and existing wallet with depositFactory as spender succeeds', async t => {
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const permitDetails = makePermitDetails();
  const depositFactoryAccountId =
    `eip155:${permitDetails.chainId}:${contractsMock.Arbitrum.depositFactory}` as AccountId;
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);
  const contractAddress = (await ctx.contractAccount).getAddress();
  const contractAccountId =
    `cosmos:${contractAddress.chainId}:${contractAddress.value}` as AccountId;

  const { accountIdByChain: byChainBefore } = await getPortfolioStatus(
    kit.reader.getPortfolioId(),
  );
  // Only agoric, no Arbitrum account yet since we haven't done any flows
  t.deepEqual(Object.keys(byChainBefore), ['agoric']);

  // Do an initial deposit, then do another deposit with the same permit details
  // to ensure we can use the `createAndDeposit` logic on an existing account.
  await doDeposit({ t, kit, orch, ctx, storage, txResolver, permitDetails });
  t.like(
    storage.getDeserialized('published.ymax0.pendingTxs.tx0').at(-1),
    {
      type: 'MAKE_ACCOUNT',
      status: 'success',
      sourceAddress: contractAccountId,
      destinationAddress: depositFactoryAccountId,
      factoryAddr: contractsMock.Arbitrum.factory,
    },
    'check first deposit creates and deposits via the depositFactory',
  );

  const { accountIdByChain: byChainAfter, accountsPending } =
    await getPortfolioStatus(kit.reader.getPortfolioId());
  t.deepEqual(Object.keys(byChainAfter), ['Arbitrum', 'agoric', 'noble']);
  t.deepEqual(accountsPending, []);

  await doDeposit({ t, kit, orch, ctx, storage, txResolver, permitDetails });
  t.like(
    storage.getDeserialized('published.ymax0.pendingTxs.tx2').at(-1),
    {
      type: 'MAKE_ACCOUNT',
      status: 'success',
      sourceAddress: contractAccountId,
      destinationAddress: depositFactoryAccountId,
      factoryAddr: contractsMock.Arbitrum.factory,
      expectedAddr: byChainAfter.Arbitrum!.split(':').at(-1),
    },
    'check second deposit goes through same flow and hits the depositFactory address again',
  );

  await documentStorageSchema(t, storage, docOpts);
});

/**
 * This test uses the router contract as the spender address.
 */
test('evmHandler.deposit via Permit2 to missing and existing wallet with router as spender succeeds', async t => {
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const permitDetails = makePermitDetails({
    spender: contractsMock.Arbitrum.remoteAccountRouter,
  });
  const destinationAccountId =
    `eip155:${permitDetails.chainId}:${contractsMock.Arbitrum.remoteAccountRouter}` as AccountId;
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);
  const contractAddress = (await ctx.contractAccount).getAddress();
  const contractAccountId =
    `cosmos:${contractAddress.chainId}:${contractAddress.value}` as AccountId;

  const { accountIdByChain: byChainBefore } = await getPortfolioStatus(
    kit.reader.getPortfolioId(),
  );
  // Only agoric, no Arbitrum account yet since we haven't done any flows
  t.deepEqual(Object.keys(byChainBefore), ['agoric']);

  const lca = kit.reader.getLocalAccount();
  const principalAccount = lca.getAddress().value;

  // Do an initial deposit, then do another deposit with the same permit details
  // to ensure we can use the provide with permit logic on an existing account.
  await doDeposit({ t, kit, orch, ctx, storage, txResolver, permitDetails });
  t.like(
    storage.getDeserialized('published.ymax0.pendingTxs.tx0').at(-1),
    {
      type: 'ROUTED_GMP',
      status: 'success',
      sourceAddress: contractAccountId,
      destinationAddress: destinationAccountId,
      details: {
        instructionType: 'ProvideRemoteAccount',
        expectedRemoteTargetAddress:
          contractsMock.Arbitrum.remoteAccountFactory,
        principalAccount,
      },
    },
    'check first deposit creates and deposits via the router',
  );

  const {
    accountIdByChain: byChainAfter,
    accountsPending,
    accountStateByChain = {},
  } = await getPortfolioStatus(kit.reader.getPortfolioId());
  t.deepEqual(Object.keys(byChainAfter), ['Arbitrum', 'agoric', 'noble']);
  t.deepEqual(accountsPending, []);
  t.like(accountStateByChain.Arbitrum, {
    state: 'active',
    routerFactory: contractsMock.Arbitrum.remoteAccountFactory,
  });

  await doDeposit({ t, kit, orch, ctx, storage, txResolver, permitDetails });
  t.like(
    storage.getDeserialized('published.ymax0.pendingTxs.tx2').at(-1),
    {
      type: 'ROUTED_GMP',
      status: 'success',
      sourceAddress: contractAccountId,
      destinationAddress: destinationAccountId,
      details: {
        instructionType: 'ProvideRemoteAccount',
        expectedRemoteTargetAddress:
          contractsMock.Arbitrum.remoteAccountFactory,
        principalAccount,
        remoteAccountAddress: accountStateByChain.Arbitrum!.address,
      },
    },
    'check second deposit goes through same flow and hits the router address again',
  );

  await documentStorageSchema(t, storage, docOpts);
});

test('evmHandler.deposit via Permit2 with existing remote account as spender succeeds', async t => {
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const existingWallet =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
  const permitDetails = makePermitDetails({
    spender: existingWallet,
  });
  const existingWalletAccountId =
    `eip155:${permitDetails.chainId}:${existingWallet}` as AccountId;
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);
  const lcaAddress = kit.reader.getLocalAccount().getAddress();
  const lcaAccountId =
    `cosmos:${lcaAddress.chainId}:${lcaAddress.value}` as AccountId;

  kit.manager.resolveAccount({
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: `eip155:${permitDetails.chainId}`,
    remoteAddress: existingWallet,
  });

  const { accountIdByChain: byChain } = await getPortfolioStatus(
    kit.reader.getPortfolioId(),
  );
  // agoric and Arbitrum account have been pre-created
  t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric']);

  // Do one deposit and ensure it deposits to the existing wallet address
  // through the remote account directly, without any factory interaction.
  await doDeposit({ t, kit, orch, ctx, storage, txResolver, permitDetails });
  t.like(
    storage.getDeserialized('published.ymax0.pendingTxs.tx0').at(-1),
    {
      type: 'GMP',
      status: 'success',
      sourceAddress: lcaAccountId,
      destinationAddress: existingWalletAccountId,
    },
    'check deposits via the existing wallet',
  );

  await documentStorageSchema(t, storage, docOpts);
});

test('evmHandler.deposit via Permit2 to a nonexisting (predicted) spender wallet succeeds', async t => {
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const {
    chainId,
    permit2Payload: { owner },
  } = makePermitDetails();
  const sourceAccountId =
    `eip155:${chainId}:${owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({
    sourceAccountId,
  });
  await provideCosmosAccount(orch, 'agoric', kit, silent);

  const lcaAddress = kit.reader.getLocalAccount().getAddress();
  const nonexistingWallet = predictWalletAddress({
    owner: lcaAddress.value,
    factoryAddress: contractsMock.Arbitrum.factory,
    gatewayAddress: contractsMock.Arbitrum.gateway,
    gasServiceAddress: contractsMock.Arbitrum.gasService,
    walletBytecode: hexToBytes(ctx.walletBytecode.replace(/^0x/, '')),
  });

  const permitDetails = makePermitDetails({
    spender: nonexistingWallet,
    permit2Payload: {
      signature: '0x5678',
    },
  });

  const lcaAccountId =
    `cosmos:${lcaAddress.chainId}:${lcaAddress.value}` as AccountId;
  const nonexistingWalletAccountId =
    `eip155:${permitDetails.chainId}:${nonexistingWallet}` as AccountId;
  const factoryAccountId =
    `eip155:${permitDetails.chainId}:${contractsMock.Arbitrum.factory}` as AccountId;

  const { accountIdByChain: byChainBefore } = await getPortfolioStatus(
    kit.reader.getPortfolioId(),
  );
  // Only agoric, no Arbitrum account yet since we haven't done any flows
  t.deepEqual(Object.keys(byChainBefore), ['agoric']);

  await doDeposit({ t, kit, orch, ctx, storage, txResolver, permitDetails });
  t.deepEqual(
    storage.getDeserialized('published.ymax0.pendingTxs.tx0').at(-1),
    {
      type: 'MAKE_ACCOUNT',
      status: 'success',
      sourceAddress: lcaAccountId,
      destinationAddress: factoryAccountId,
      factoryAddr: contractsMock.Arbitrum.factory,
      expectedAddr: nonexistingWallet,
    },
    'create dispatches to the factory for predicted wallets',
  );

  // Check that the deposit GMP was also performed.
  t.deepEqual(
    storage.getDeserialized('published.ymax0.pendingTxs.tx2').at(-1),
    {
      type: 'GMP',
      status: 'success',
      sourceAddress: lcaAccountId,
      destinationAddress: nonexistingWalletAccountId,
    },
    'deposit flow should also perform GMP to the predicted wallet address',
  );

  const portfolioId = kit.reader.getPortfolioId();
  const { accountIdByChain: byChainAfter } =
    await getPortfolioStatus(portfolioId);
  t.deepEqual(Object.keys(byChainAfter), ['Arbitrum', 'agoric', 'noble']);
  t.is(
    byChainAfter.Arbitrum,
    nonexistingWalletAccountId,
    'predicted wallet is recorded',
  );

  await documentStorageSchema(t, storage, docOpts);
});

test('evmHandler.deposit via Permit2 with depositFactory as spender to existing wallet fails when expected address mismatch', async t => {
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const existingWallet =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
  const permitDetails = makePermitDetails();
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);

  assert(
    axelarCCTPConfig.Arbitrum.reference === `${permitDetails.chainId}`,
    'chainId should match axelarCCTPConfig',
  );
  kit.manager.resolveAccount({
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: `eip155:${permitDetails.chainId}`,
    remoteAddress: existingWallet,
  });

  const { accountIdByChain: byChain } = await getPortfolioStatus(
    kit.reader.getPortfolioId(),
  );
  // agoric and Arbitrum account have been pre-created
  t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric']);

  await doDeposit({
    t,
    kit,
    orch,
    ctx,
    storage,
    txResolver,
    permitDetails,
    expectedFlowOutcome: 'fail',
  });

  await documentStorageSchema(t, storage, docOpts);
});

// #endregion evmHandler.deposit tests

test('move Aave position Base -> Optimism via CCTPv2', async t => {
  const { orch, ctx, offer, storage, tapPK, txResolver } = mocks({});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  // Seed a Base Aave position.
  {
    const amount = make(USDC, 50_000_000n);
    const seat = makeMockSeat({ Aave: amount }, {}, offer.log);
    const feeAcct = AmountMath.make(BLD, 50n);
    const feeCall = AmountMath.make(BLD, 100n);
    const depositP = rebalance(
      orch,
      ctx,
      seat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Base', amount, fee: feeAcct },
          { src: '@Base', dest: 'Aave_Base', amount, fee: feeCall },
        ],
      },
      kit,
    );
    await Promise.all([
      depositP,
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
        await txResolver.drainPending();
      }),
    ]);
  }

  const webUiDone = (async () => {
    const seat = makeMockSeat({}, {}, offer.log);
    await executePlan(orch, ctx, seat, {}, kit, { type: 'rebalance' });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'rebalance') throw t.fail(detail.type);

    const amount = make(USDC, 20_000_000n);
    const feeCall = AmountMath.make(BLD, 100n);
    const feeGmp = AmountMath.make(BLD, 50n);
    const steps: MovementDesc[] = [
      { src: 'Aave_Base', dest: '@Base', amount, fee: feeCall },
      {
        src: '@Base',
        dest: '@Optimism',
        amount,
        fee: feeGmp,
        detail: { cctpVersion: 2n, maxFee: 3n, minFinalityThreshold: 1000n },
      },
      { src: '@Optimism', dest: 'Aave_Optimism', amount, fee: feeCall },
    ];

    t.deepEqual(wayFromSrcToDest(steps[1]), {
      how: 'CCTPv2',
      src: 'Base',
      dest: 'Optimism',
    });

    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();

  await Promise.all([webUiDone, plannerP, txResolver.drainPending()]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});

const sendGMPContractCallTest = test.macro({
  title: (providedTitle = '', useRouter: boolean) =>
    `sendGMPContractCall unsubscribes resolver on send failure (${providedTitle || (useRouter ? 'routed' : 'legacy')})`,
  async exec(t, useRouter: boolean) {
    const { resolverClient, storage, makeProgressTracker } = mocks({});
    const lcaAddress = harden({ chainId: 'agoric-3', value: 'agoric1test' });
    const ctx = {
      feeAccount: {
        getAddress: () => lcaAddress,
        send: async () => {
          throw Error('fee send failed');
        },
      },
      lca: { getAddress: () => lcaAddress, transfer: async () => {} },
      gmpFee: { denom: 'uaxl', value: 100n },
      gmpChain: {
        getChainInfo: async () => ({ chainId: 'axelar-testnet-lisbon-3' }),
      },
      gmpAddresses,
      resolverClient,
      axelarIds: axelarIdsMock,
      addresses: contractsMock.Avalanche,
      nobleForwardingChannel: 'channel-0',
    } as unknown as EVMContext;

    const gmpAcct = {
      namespace: 'eip155',
      chainName: 'Avalanche',
      remoteAddress: '0x1234567890AbcdEF1234567890aBcdef12345678',
      chainId: 'eip155:43114',
      ...(useRouter
        ? { routerFactory: contractsMock.Avalanche.remoteAccountFactory }
        : {}),
    } as const;

    const calls = [
      {
        target: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' as const,
        functionSignature: 'supply(address,uint256,address,uint16)',
        args: [
          '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf',
          1_000_000n,
          '0x1234567890AbcdEF1234567890aBcdef12345678',
          0,
        ],
      },
    ];

    const send = useRouter ? sendRoutedGMPContractCall : sendGMPContractCall;

    await t.throwsAsync(
      () =>
        send(ctx, gmpAcct, calls, {
          progressTracker: makeProgressTracker(),
        }),
      { message: 'fee send failed' },
    );

    await eventLoopIteration();
    const values = storage.getDeserialized('published.ymax0.pendingTxs.tx0');
    const last = values.at(-1) as any;
    t.is(last.status, 'failed', 'transaction settled as failed');
    t.truthy(last.rejectionReason, 'includes rejection reason');
  },
});

test(expectUnhandled(1, sendGMPContractCallTest), false);
test(sendGMPContractCallTest, true);

const sendPermit2GMPTest = test.macro({
  title: (providedTitle = '', useRouter: boolean) =>
    `sendPermit2GMP unsubscribes resolver on send failure (${providedTitle || (useRouter ? 'routed' : 'legacy')})`,
  async exec(t, useRouter: boolean) {
    const { resolverClient, storage, makeProgressTracker } = mocks({});
    const lcaAddress = harden({ chainId: 'agoric-3', value: 'agoric1test' });
    const ctx = {
      feeAccount: {
        getAddress: () => lcaAddress,
        send: async () => {
          throw Error('fee send failed');
        },
      },
      lca: { getAddress: () => lcaAddress, transfer: async () => {} },
      gmpFee: { denom: 'uaxl', value: 100n },
      gmpChain: {
        getChainInfo: async () => ({ chainId: 'axelar-testnet-lisbon-3' }),
      },
      gmpAddresses,
      resolverClient,
      axelarIds: axelarIdsMock,
      addresses: contractsMock.Avalanche,
      nobleForwardingChannel: 'channel-0',
    } as unknown as EVMContext;

    const gmpAcct = {
      namespace: 'eip155',
      chainName: 'Avalanche',
      remoteAddress: '0x1234567890AbcdEF1234567890aBcdef12345678',
      chainId: 'eip155:43114',
      ...(useRouter
        ? { routerFactory: contractsMock.Avalanche.remoteAccountFactory }
        : {}),
    } as const;

    const permit2Payload = {
      permit: {
        permitted: {
          token: contractsMock.Avalanche.usdc,
          amount: 1_000_000_000n,
        },
        nonce: 7115368379195441n,
        deadline: 1357923600n,
      },
      owner: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234' as `0x${string}`,
    };

    const send = useRouter ? sendPermit2RoutedGMP : sendPermit2GMP;

    await t.throwsAsync(
      () =>
        send(ctx, gmpAcct, permit2Payload, 1_000_000n, {
          progressTracker: makeProgressTracker(),
        }),
      { message: 'fee send failed' },
    );

    await eventLoopIteration();
    const values = storage.getDeserialized('published.ymax0.pendingTxs.tx0');
    const last = values.at(-1) as any;
    t.is(last.status, 'failed', 'transaction settled as failed');
    t.truthy(last.rejectionReason, 'includes rejection reason');
  },
});
test(expectUnhandled(1, sendPermit2GMPTest), false);
test(sendPermit2GMPTest, true);

test('protocolUSDN.supply executes swap+lock on Noble ICA', async t => {
  const calls: unknown[][] = [];
  const ica = {
    getAddress: () =>
      harden({
        value: 'noble1test',
        chainId: 'noble-1',
        encoding: 'bech32',
      }),
    executeEncodedTx: async (...args: unknown[]) => {
      calls.push(args);
      return undefined;
    },
  };

  await protocolUSDN.supply(
    { usdnOut: 9_900_000n, vault: 1 },
    make(USDC, 10_000_000n),
    { ica } as any,
    { timeoutHeight: 123n } as any,
  );

  t.is(calls.length, 1);
  const [protoMessages, options] = calls[0];
  t.is((protoMessages as unknown[]).length, 2);
  t.deepEqual(options, { timeoutHeight: 123n });
});

test('protocolUSDN.withdraw rejects claim mode', async t => {
  const ica = {
    getAddress: () =>
      harden({
        value: 'noble1test',
        chainId: 'noble-1',
        encoding: 'bech32',
      }),
    executeEncodedTx: async () => undefined,
  };

  await t.throwsAsync(
    () =>
      protocolUSDN.withdraw(
        { usdnOut: 9_900_000n },
        make(USDC, 10_000_000n),
        { ica } as any,
        true,
      ),
    { message: 'claiming USDN is not supported' },
  );
});

test('agoricToNoble.apply transfers USDC denom to Noble ICA', async t => {
  const calls: unknown[][] = [];
  const src = {
    lca: {
      transfer: async (...args: unknown[]) => {
        calls.push(args);
      },
    },
  };
  const destAddress = harden({
    value: 'noble1dest',
    chainId: 'noble-1',
    encoding: 'bech32',
  });

  await agoricToNoble.apply(
    { usdc: { denom: 'ibc/USDC' as any } },
    make(USDC, 7_000_000n),
    src as any,
    { ica: { getAddress: () => destAddress } } as any,
    { timeoutRelativeSeconds: 30 } as any,
  );

  t.deepEqual(calls, [
    [
      destAddress,
      { value: 7_000_000n, denom: 'ibc/USDC' },
      { timeoutRelativeSeconds: 30 },
    ],
  ]);
});

test('nobleToAgoric.apply transfers uusdc from Noble ICA', async t => {
  const calls: unknown[][] = [];
  const destAddress = harden({
    value: 'agoric1dest',
    chainId: 'agoric-3',
    encoding: 'bech32',
  });

  await nobleToAgoric.apply(
    {} as any,
    make(USDC, 8_000_000n),
    {
      ica: {
        transfer: async (...args: unknown[]) => {
          calls.push(args);
        },
      },
    } as any,
    { lca: { getAddress: () => destAddress } } as any,
    { timeoutRelativeSeconds: 60 } as any,
  );

  t.deepEqual(calls, [
    [
      destAddress,
      { value: 8_000_000n, denom: 'uusdc' },
      { timeoutRelativeSeconds: 60 },
    ],
  ]);
});
