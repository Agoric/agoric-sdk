import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  decodeAddressHook,
  encodeAddressHook,
} from '@agoric/cosmic-proto/address-hooks.js';
import type { NatAmount } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { CosmosChainAddressShape, denomHash } from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { type ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { q } from '@endo/errors';
import type { EReturn } from '@endo/far';
import { Far } from '@endo/pass-style';
import { M, mustMatch } from '@endo/patterns';
import type { TestFn } from 'ava';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareAdvancer, stateShape } from '../../src/exos/advancer.js';
import {
  makeAdvanceDetailsShape,
  type SettlerKit,
} from '../../src/exos/settler.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { CctpTxEvidenceShape } from '../../src/type-guards.js';
import type { LiquidityPoolKit } from '../../src/types.js';
import { makeFeeTools } from '../../src/utils/fees.js';
import {
  intermediateRecipient,
  MockCctpTxEvidences,
  settlementAddress,
} from '../fixtures.js';
import {
  makeTestFeeConfig,
  makeTestLogger,
  prepareMockOrchAccounts,
} from '../mocks.js';
import { commonSetup } from '../supports.js';

const trace = makeTracer('AdvancerTest', false);

const LOCAL_DENOM = `ibc/${denomHash({
  denom: 'uusdc',
  channelId:
    fetchedChainInfo.agoric.connections['noble-1'].transferChannel.channelId,
})}`;

type CommonSetup = EReturn<typeof commonSetup>;

const theExit = harden(() => {}); // for ava comparison

const createTestExtensions = (t, common: CommonSetup) => {
  const {
    facadeServices: { chainHub },
    brands: { usdc },
    commonPrivateArgs: { storageNode },
    utils: { contractZone, vowTools },
  } = common;

  const { log, inspectLogs } = makeTestLogger(t.log);

  chainHub.registerChain('agoric', fetchedChainInfo.agoric);
  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);

  const statusManager = prepareStatusManager(
    contractZone.subZone('status-manager'),
    storageNode.makeChildNode('txns'),
    { marshaller: common.commonPrivateArgs.marshaller },
  );

  const mockAccounts = prepareMockOrchAccounts(
    contractZone.subZone('accounts'),
    {
      vowTools,
      log: t.log,
      usdc,
    },
  );

  const mockZCF = Far('MockZCF', {
    makeEmptySeatKit: () => ({
      zcfSeat: Far('MockZCFSeat', { exit: theExit }),
    }),
  });

  const localTransferVK = vowTools.makeVowKit<void>();
  // pretend funds move from tmpSeat to poolAccount
  const resolveLocalTransferV = () => localTransferVK.resolver.resolve();
  const rejectLocalTransfeferV = () =>
    localTransferVK.resolver.reject(
      new Error('One or more deposits failed: simulated error'),
    );
  const withdrawToSeatVK = vowTools.makeVowKit<void>();
  const resolveWithdrawToSeatV = () => withdrawToSeatVK.resolver.resolve();
  const rejectWithdrawToSeatV = () =>
    withdrawToSeatVK.resolver.reject(
      new Error('One or more deposits failed: simulated error'),
    );
  const mockZoeTools = Far('MockZoeTools', {
    localTransfer(...args: Parameters<ZoeTools['localTransfer']>) {
      trace('ZoeTools.localTransfer called with', args);
      return localTransferVK.vow;
    },
    withdrawToSeat(...args: Parameters<ZoeTools['withdrawToSeat']>) {
      trace('ZoeTools.withdrawToSeat called with', args);
      return withdrawToSeatVK.vow;
    },
  });

  const feeConfig = makeTestFeeConfig(usdc);
  const makeAdvancer = prepareAdvancer(contractZone.subZone('advancer'), {
    chainHub,
    feeConfig,
    log,
    statusManager,
    usdc: harden({
      brand: usdc.brand,
      denom: LOCAL_DENOM,
    }),
    vowTools,
    // @ts-expect-error mocked zcf
    zcf: mockZCF,
    zoeTools: mockZoeTools,
  });

  type NotifyArgs = Parameters<SettlerKit['notifier']['notifyAdvancingResult']>;
  const notifyAdvancingResultCalls: NotifyArgs[] = [];
  const mockNotifyF = Far('Settler Notify Facet', {
    notifyAdvancingResult: (...args: NotifyArgs) => {
      trace('Settler.notifyAdvancingResult called with', args);
      const [advanceDetails, success] = args;
      mustMatch(harden(advanceDetails), makeAdvanceDetailsShape(usdc.brand));
      mustMatch(success, M.boolean());
      notifyAdvancingResultCalls.push(args);
    },
    // assume this never returns true for most tests
    checkMintedEarly: (evidence, destination) => {
      mustMatch(harden(evidence), CctpTxEvidenceShape);
      mustMatch(destination, CosmosChainAddressShape);
      return false;
    },
  });

  const mockBorrowerFacetCalls: {
    borrow: Parameters<LiquidityPoolKit['borrower']['borrow']>[];
    returnToPool: Parameters<LiquidityPoolKit['borrower']['returnToPool']>[];
  } = { borrow: [], returnToPool: [] };

  const mockBorrowerF = Far('LiquidityPool Borrow Facet', {
    borrow: (seat: ZCFSeat, amount: NatAmount) => {
      mockBorrowerFacetCalls.borrow.push([seat, amount]);
    },
    returnToPool: (seat: ZCFSeat, amount: NatAmount) => {
      mockBorrowerFacetCalls.returnToPool.push([seat, amount]);
    },
  });

  const advancer = makeAdvancer({
    borrower: mockBorrowerF,
    notifier: mockNotifyF,
    poolAccount: mockAccounts.mockPoolAccount.account,
    intermediateRecipient,
    settlementAddress,
  });

  return {
    constants: {
      localDenom: LOCAL_DENOM,
      feeConfig,
    },
    helpers: {
      inspectLogs,
      inspectNotifyCalls: () => harden(notifyAdvancingResultCalls),
      inspectBorrowerFacetCalls: () => harden(mockBorrowerFacetCalls),
    },
    mocks: {
      ...mockAccounts,
      mockBorrowerF,
      mockNotifyF,
      resolveLocalTransferV,
      rejectLocalTransfeferV,
      resolveWithdrawToSeatV,
      rejectWithdrawToSeatV,
    },
    services: {
      advancer,
      makeAdvancer,
      statusManager,
      feeTools: makeFeeTools(feeConfig),
    },
  } as const;
};

type TestContext = CommonSetup & {
  extensions: ReturnType<typeof createTestExtensions>;
};

const test = anyTest as TestFn<TestContext>;

test.beforeEach(async t => {
  const common = await commonSetup(t);
  t.context = {
    ...common,
    extensions: createTestExtensions(t, common),
  };
});

test('stateShape', t => {
  t.snapshot(stateShape);
});

test('updates status to ADVANCING in happy path', async t => {
  const {
    extensions: {
      services: { advancer, feeTools },
      helpers: { inspectLogs, inspectNotifyCalls },
      mocks: { mockPoolAccount, resolveLocalTransferV },
    },
    brands: { usdc },
    bootstrap: { storage },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  void advancer.handleTransactionEvent({ evidence, risk: {} });

  // pretend borrow succeeded and funds were depositing to the LCA
  resolveLocalTransferV();
  // pretend the IBC Transfer settled
  mockPoolAccount.transferVResolver.resolve();
  // wait for handleTransactionEvent to do work
  await eventLoopIteration();

  t.deepEqual(
    storage.getDeserialized(`fun.txns.${evidence.txHash}`),
    [
      { evidence, status: PendingTxStatus.Observed },
      { status: PendingTxStatus.Advancing },
    ],
    'ADVANCED status in happy path',
  );

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    [
      'Advance succeeded',
      {
        advanceAmount: {
          brand: usdc.brand,
          value: 146999999n,
        },
        destination: {
          chainId: 'osmosis-1',
          encoding: 'bech32',
          value: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
        },
      },
    ],
  ]);

  // We expect to see an `Advanced` update, but that is now Settler's job.
  // but we can ensure it's called
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: evidence.txHash,
        forwardingAddress: evidence.tx.forwardingAddress,
        fullAmount: usdc.make(evidence.tx.amount),
        destination: {
          value: decodeAddressHook(evidence.aux.recipientAddress).query.EUD,
        },
      },
      true, // indicates transfer succeeded
    ],
  ]);
});

test('updates status to ADVANCE_SKIPPED on insufficient pool funds', async t => {
  const {
    brands: { usdc },
    bootstrap: { storage },
    extensions: {
      services: { makeAdvancer },
      helpers: { inspectLogs },
      mocks: { mockPoolAccount, mockNotifyF },
    },
  } = t.context;

  const mockBorrowerFacet = Far('LiquidityPool Borrow Facet', {
    borrow: (seat: ZCFSeat, amount: NatAmount) => {
      throw new Error(
        `Cannot borrow. Requested ${q(amount)} must be less than pool balance ${q(usdc.make(1n))}.`,
      );
    },
    returnToPool: () => {}, // not expecting this to be called
  });

  // make a new advancer that intentionally throws
  const advancer = makeAdvancer({
    borrower: mockBorrowerFacet,
    notifier: mockNotifyF,
    poolAccount: mockPoolAccount.account,
    intermediateRecipient,
    settlementAddress,
  });

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  void advancer.handleTransactionEvent({ evidence, risk: {} });
  await eventLoopIteration();

  t.deepEqual(
    storage.getDeserialized(`fun.txns.${evidence.txHash}`),
    [
      { evidence, status: PendingTxStatus.Observed },
      {
        risksIdentified: [
          'Cannot borrow. Requested {"brand":"[Alleged: USDC brand]","value":"[293999999n]"} must be less than pool balance {"brand":"[Alleged: USDC brand]","value":"[1n]"}.',
        ],
        status: 'ADVANCE_SKIPPED',
      },
    ],
    'ADVANCE_SKIPPED status on insufficient pool funds',
  );

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    [
      'Advancer error:',
      Error(
        `Cannot borrow. Requested ${q(usdc.make(293999999n))} must be less than pool balance ${q(usdc.make(1n))}.`,
      ),
    ],
  ]);
});

test('updates status to ADVANCE_SKIPPED if makeChainAddress fails', async t => {
  const {
    bootstrap: { storage },
    extensions: {
      services: { advancer },
      helpers: { inspectLogs },
    },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_UNKNOWN_EUD();
  await advancer.handleTransactionEvent({ evidence, risk: {} });
  await eventLoopIteration();

  t.deepEqual(
    storage.getDeserialized(`fun.txns.${evidence.txHash}`),
    [
      { evidence, status: PendingTxStatus.Observed },
      {
        risksIdentified: ['Chain info not found for bech32Prefix "random"'],
        status: 'ADVANCE_SKIPPED',
      },
    ],
    'ADVANCE_SKIPPED status on makeChainAddress failure',
  );

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: random1addr'],
    [
      'Advancer error:',
      Error('Chain info not found for bech32Prefix "random"'),
    ],
  ]);
});

test('recovery behavior if Advance Fails (ADVANCE_FAILED)', async t => {
  const {
    bootstrap: { storage },
    extensions: {
      services: { advancer, feeTools },
      helpers: { inspectBorrowerFacetCalls, inspectLogs, inspectNotifyCalls },
      mocks: { mockPoolAccount, resolveLocalTransferV, resolveWithdrawToSeatV },
    },
    brands: { usdc },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  void advancer.handleTransactionEvent({ evidence, risk: {} });

  // pretend borrow and deposit to LCA succeed
  resolveLocalTransferV();
  await eventLoopIteration();

  t.deepEqual(
    storage.getDeserialized(`fun.txns.${evidence.txHash}`),
    [
      { evidence, status: PendingTxStatus.Observed },
      { status: PendingTxStatus.Advancing },
    ],
    'tx is Advancing',
  );

  mockPoolAccount.transferVResolver.reject(new Error('simulated error'));
  await eventLoopIteration();

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    ['Advance failed', Error('simulated error')],
  ]);

  // We expect to see an `AdvancedFailed` update, but that is now Settler's job.
  // but we can ensure it's called
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: evidence.txHash,
        forwardingAddress: evidence.tx.forwardingAddress,
        fullAmount: usdc.make(evidence.tx.amount),
        destination: {
          value: decodeAddressHook(evidence.aux.recipientAddress).query.EUD,
        },
      },
      false, // this indicates transfer failed
    ],
  ]);

  // simulate withdrawing `advanceAmount` from PoolAccount to tmpReturnSeat
  resolveWithdrawToSeatV();
  await eventLoopIteration();
  const { returnToPool } = inspectBorrowerFacetCalls();
  t.is(
    returnToPool.length,
    1,
    'returnToPool is called after ibc transfer fails',
  );
  t.deepEqual(
    returnToPool[0],
    [
      Far('MockZCFSeat', { exit: theExit }),
      usdc.make(293999999n), // 300000000n net of fees
    ],
    'same amount borrowed is returned to LP',
  );
});

// unexpected, terminal state. test that log('🚨') is called
test('logs error if withdrawToSeat fails during AdvanceFailed recovery', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs, inspectNotifyCalls },
      mocks: { mockPoolAccount, resolveLocalTransferV, rejectWithdrawToSeatV },
    },
    brands: { usdc },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  void advancer.handleTransactionEvent({ evidence, risk: {} });

  // pretend borrow succeeded and funds were depositing to the LCA
  resolveLocalTransferV();
  // pretend the IBC Transfer failed
  mockPoolAccount.transferVResolver.reject(new Error('transfer failed'));
  // pretend withdrawToSeat failed
  rejectWithdrawToSeatV();
  await eventLoopIteration();

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    ['Advance failed', Error('transfer failed')],
    [
      '🚨 withdraw {"brand":"[Alleged: USDC brand]","value":"[146999999n]"} from "poolAccount" to return to pool failed',
      Error('One or more deposits failed: simulated error'),
    ],
  ]);

  // ensure Settler is notified of failed advance
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: evidence.txHash,
        forwardingAddress: evidence.tx.forwardingAddress,
      },
      false, // indicates transfer failed
    ],
  ]);
});

test('logs error if returnToPool fails during AdvanceFailed recovery', async t => {
  const {
    brands: { usdc },
    extensions: {
      services: { makeAdvancer },
      helpers: { inspectLogs, inspectNotifyCalls },
      mocks: {
        mockPoolAccount,
        mockNotifyF,
        resolveLocalTransferV,
        resolveWithdrawToSeatV,
      },
    },
  } = t.context;

  const mockBorrowerFacet = Far('LiquidityPool Borrow Facet', {
    borrow: (seat: ZCFSeat, amount: NatAmount) => {
      // note: will not be tracked by `inspectBorrowerFacetCalls`
    },
    returnToPool: (seat: ZCFSeat, amount: NatAmount) => {
      throw new Error('returnToPool failed');
    },
  });

  // make a new advancer that intentionally throws during returnToPool
  const advancer = makeAdvancer({
    borrower: mockBorrowerFacet,
    notifier: mockNotifyF,
    poolAccount: mockPoolAccount.account,
    intermediateRecipient,
    settlementAddress,
  });

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  void advancer.handleTransactionEvent({ evidence, risk: {} });

  // pretend borrow succeeded and funds were depositing to the LCA
  resolveLocalTransferV();
  // pretend the IBC Transfer failed
  mockPoolAccount.transferVResolver.reject(new Error('transfer failed'));
  // pretend withdrawToSeat succeeded
  resolveWithdrawToSeatV();
  await eventLoopIteration();

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    ['Advance failed', Error('transfer failed')],
    [
      '🚨 return {"brand":"[Alleged: USDC brand]","value":"[146999999n]"} to pool failed. funds remain on "tmpReturnSeat"',
      Error('returnToPool failed'),
    ],
  ]);

  // ensure Settler is notified of failed advance
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: evidence.txHash,
        forwardingAddress: evidence.tx.forwardingAddress,
      },
      false, // indicates transfer failed
    ],
  ]);
});

test('updates status to ADVANCE_SKIPPED if pre-condition checks fail', async t => {
  const {
    bootstrap: { storage },
    extensions: {
      services: { advancer },
      helpers: { inspectLogs },
    },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_NO_PARAMS();

  await advancer.handleTransactionEvent({ evidence, risk: {} });
  await eventLoopIteration();

  t.deepEqual(
    storage.getDeserialized(`fun.txns.${evidence.txHash}`),
    [
      { evidence, status: PendingTxStatus.Observed },
      {
        risksIdentified: ['query: {} - Must have missing properties ["EUD"]'],
        status: 'ADVANCE_SKIPPED',
      },
    ],
    'tx is recorded as ADVANCE_SKIPPED',
  );

  t.deepEqual(inspectLogs(), [
    [
      'Advancer error:',
      Error('query: {} - Must have missing properties ["EUD"]'),
    ],
  ]);

  await advancer.handleTransactionEvent({
    evidence: {
      ...MockCctpTxEvidences.AGORIC_NO_PARAMS(
        encodeAddressHook(settlementAddress.value, {
          EUD: 'osmo1234',
          extra: 'value',
        }),
      ),
      txHash:
        '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761799',
    },
    risk: {},
  });

  const [, ...remainingLogs] = inspectLogs();
  t.deepEqual(remainingLogs, [
    [
      'Advancer error:',
      Error(
        'query: {"EUD":"osmo1234","extra":"value"} - Must not have unexpected properties: ["extra"]',
      ),
    ],
  ]);
});

test('updates status to ADVANCE_SKIPPED if risks identified', async t => {
  const {
    bootstrap: { storage },
    extensions: {
      services: { advancer },
      helpers: { inspectLogs },
    },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  await advancer.handleTransactionEvent({
    evidence,
    risk: { risksIdentified: ['TOO_LARGE_AMOUNT'] },
  });
  await eventLoopIteration();

  t.deepEqual(
    storage.getDeserialized(`fun.txns.${evidence.txHash}`),
    [
      { evidence, status: PendingTxStatus.Observed },
      {
        status: PendingTxStatus.AdvanceSkipped,
        risksIdentified: ['TOO_LARGE_AMOUNT'],
      },
    ],
    'tx is recorded as ADVANCE_SKIPPED',
  );

  t.deepEqual(inspectLogs(), [['risks identified, skipping advance']]);
});

test('will not advance same txHash:chainId evidence twice', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs },
      mocks: { mockPoolAccount, resolveLocalTransferV },
    },
    brands: { usdc },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // First attempt
  void advancer.handleTransactionEvent({ evidence: mockEvidence, risk: {} });
  resolveLocalTransferV();
  mockPoolAccount.transferVResolver.resolve();
  await eventLoopIteration();

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    [
      'Advance succeeded',
      {
        advanceAmount: { brand: usdc.brand, value: 146999999n },
        destination: {
          chainId: 'osmosis-1',
          encoding: 'bech32',
          value: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
        },
      },
    ],
  ]);

  // Second attempt
  void advancer.handleTransactionEvent({ evidence: mockEvidence, risk: {} });
  await eventLoopIteration();
  const [, , ...remainingLogs] = inspectLogs();
  t.deepEqual(remainingLogs, [
    [
      'txHash already seen:',
      '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702',
    ],
  ]);
});

test('returns payment to LP if zoeTools.localTransfer fails', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs, inspectBorrowerFacetCalls, inspectNotifyCalls },
      mocks: { rejectLocalTransfeferV },
    },
    brands: { usdc },
  } = t.context;
  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  void advancer.handleTransactionEvent({ evidence: mockEvidence, risk: {} });
  rejectLocalTransfeferV();

  await eventLoopIteration();

  t.deepEqual(
    inspectLogs(),
    [
      ['decoded EUD: osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
      [
        '⚠️ deposit to localOrchAccount failed, attempting to return payment to LP',
        Error('One or more deposits failed: simulated error'),
      ],
    ],
    'contract logs report error',
  );

  const { borrow, returnToPool } = inspectBorrowerFacetCalls();

  const expectedArguments = [
    Far('MockZCFSeat', { exit: theExit }),
    usdc.make(146999999n), // net of fees
  ];

  t.is(borrow.length, 1, 'borrow is called before zt.localTransfer fails');
  t.deepEqual(borrow[0], expectedArguments, 'borrow arguments match expected');

  t.is(
    returnToPool.length,
    1,
    'returnToPool is called after zt.localTransfer fails',
  );
  t.deepEqual(
    returnToPool[0],
    expectedArguments,
    'same amount borrowed is returned to LP',
  );

  t.like(
    inspectNotifyCalls(),
    [
      [
        {
          txHash: mockEvidence.txHash,
          forwardingAddress: mockEvidence.tx.forwardingAddress,
        },
        false, // indicates advance failed
      ],
    ],
    'Advancing tx is recorded as AdvanceFailed',
  );
});

test('alerts if `returnToPool` fallback fails', async t => {
  const {
    brands: { usdc },
    extensions: {
      services: { makeAdvancer },
      helpers: { inspectLogs, inspectNotifyCalls },
      mocks: { mockPoolAccount, mockNotifyF, rejectLocalTransfeferV },
    },
  } = t.context;

  const mockBorrowerFacet = Far('LiquidityPool Borrow Facet', {
    borrow: (seat: ZCFSeat, amount: NatAmount) => {
      // note: will not be tracked by `inspectBorrowerFacetCalls`
    },
    returnToPool: (seat: ZCFSeat, amount: NatAmount) => {
      throw new Error(
        `⚠️ borrowSeatAllocation ${q({ USDC: usdc.make(0n) })} less than amountKWR ${q(amount)}`,
      );
    },
  });

  // make a new advancer that intentionally throws during returnToPool
  const advancer = makeAdvancer({
    borrower: mockBorrowerFacet,
    notifier: mockNotifyF,
    poolAccount: mockPoolAccount.account,
    intermediateRecipient,
    settlementAddress,
  });

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  void advancer.handleTransactionEvent({ evidence: mockEvidence, risk: {} });
  rejectLocalTransfeferV();

  await eventLoopIteration();

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    [
      '⚠️ deposit to localOrchAccount failed, attempting to return payment to LP',
      Error('One or more deposits failed: simulated error'),
    ],
    [
      '🚨 deposit to localOrchAccount failure recovery failed',
      Error(
        `⚠️ borrowSeatAllocation ${q({ USDC: usdc.make(0n) })} less than amountKWR ${q(usdc.make(146999999n))}`,
      ),
    ],
  ]);

  await eventLoopIteration();

  t.like(
    inspectNotifyCalls(),
    [
      [
        {
          txHash: mockEvidence.txHash,
          forwardingAddress: mockEvidence.tx.forwardingAddress,
        },
        false, // indicates advance failed
      ],
    ],
    'Advancing tx is recorded as AdvanceFailed',
  );
});

test('rejects advances to unknown settlementAccount', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs },
    },
  } = t.context;

  const invalidSettlementAcct =
    'agoric1ax7hmw49tmqrdld7emc5xw3wf43a49rtkacr9d5nfpqa0y7k6n0sl8v94h';
  t.not(settlementAddress.value, invalidSettlementAcct);
  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO(
    encodeAddressHook(invalidSettlementAcct, {
      EUD: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
    }),
  );

  void advancer.handleTransactionEvent({ evidence: mockEvidence, risk: {} });
  await eventLoopIteration();
  t.deepEqual(inspectLogs(), [
    [
      'Advancer error:',
      Error(
        '⚠️ baseAddress of address hook "agoric1ax7hmw49tmqrdld7emc5xw3wf43a49rtkacr9d5nfpqa0y7k6n0sl8v94h" does not match the expected address "agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek"',
      ),
    ],
  ]);
});

test('no status update if `checkMintedEarly` returns true', async t => {
  const {
    brands: { usdc },
    bootstrap: { storage },
    extensions: {
      services: { makeAdvancer },
      helpers: { inspectLogs },
      mocks: { mockPoolAccount, mockBorrowerF },
    },
  } = t.context;

  const mockNotifyF = Far('Settler Notify Facet', {
    notifyAdvancingResult: () => {},
    checkMintedEarly: (evidence, destination) => {
      return true;
    },
  });

  const advancer = makeAdvancer({
    borrower: mockBorrowerF,
    notifier: mockNotifyF,
    poolAccount: mockPoolAccount.account,
    intermediateRecipient,
    settlementAddress,
  });

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  void advancer.handleTransactionEvent({ evidence, risk: {} });
  await eventLoopIteration();

  // advancer does not post a tx status; settler will Forward and
  // communicate Forwarded/ForwardFailed status'
  t.throws(() => storage.getDeserialized(`fun.txns.${evidence.txHash}`), {
    message: /no data at path fun.txns.0x/,
  });

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men'],
    // no add'l logs as we return early
  ]);
});

test('uses bank send for agoric1 EUD', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs, inspectNotifyCalls },
      mocks: { mockPoolAccount, resolveLocalTransferV },
    },
    brands: { usdc },
    bootstrap: { storage },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_AGORIC();
  void advancer.handleTransactionEvent({ evidence, risk: {} });

  // pretend borrow succeeded and funds were depositing to the LCA
  resolveLocalTransferV();
  // pretend the Bank Send settled
  mockPoolAccount.sendVResolver.resolve();
  // wait for handleTransactionEvent to do work
  await eventLoopIteration();

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: agoric13rj0cc0hm5ac2nt0sdup2l7gvkx4v9tyvgq3h2'],
    [
      'Advance succeeded',
      {
        advanceAmount: {
          brand: usdc.brand,
          value: 244999999n,
        },
        destination: {
          chainId: 'agoric-3',
          encoding: 'bech32',
          value: 'agoric13rj0cc0hm5ac2nt0sdup2l7gvkx4v9tyvgq3h2',
        },
      },
    ],
  ]);

  // ensure Settler is notified of successful advance
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: evidence.txHash,
        forwardingAddress: evidence.tx.forwardingAddress,
        fullAmount: usdc.make(evidence.tx.amount),
        destination: {
          value: decodeAddressHook(evidence.aux.recipientAddress).query.EUD,
        },
      },
      true, // indicates send succeeded
    ],
  ]);
});

test('notifies of advance failure if bank send fails', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs, inspectBorrowerFacetCalls, inspectNotifyCalls },
      mocks: { mockPoolAccount, resolveLocalTransferV, resolveWithdrawToSeatV },
    },
    brands: { usdc },
  } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_AGORIC();
  void advancer.handleTransactionEvent({ evidence, risk: {} });

  // pretend borrow succeeded and funds were depositing to the LCA
  resolveLocalTransferV();
  // pretend the Bank Send failed
  mockPoolAccount.sendVResolver.reject(new Error('simulated error'));
  // wait for handleTransactionEvent to do work
  await eventLoopIteration();

  t.deepEqual(inspectLogs(), [
    ['decoded EUD: agoric13rj0cc0hm5ac2nt0sdup2l7gvkx4v9tyvgq3h2'],
    ['Advance failed', Error('simulated error')],
  ]);

  // ensure Settler is notified of failed advance
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: evidence.txHash,
        forwardingAddress: evidence.tx.forwardingAddress,
        fullAmount: usdc.make(evidence.tx.amount),
        destination: {
          value: decodeAddressHook(evidence.aux.recipientAddress).query.EUD,
        },
      },
      false, // indicates send failed
    ],
  ]);

  // verify funds are returned to pool
  resolveWithdrawToSeatV();
  await eventLoopIteration();
  const { returnToPool } = inspectBorrowerFacetCalls();
  t.is(returnToPool.length, 1, 'returnToPool is called after bank send fails');
  t.deepEqual(
    returnToPool[0],
    [
      Far('MockZCFSeat', { exit: theExit }),
      usdc.make(244999999n), // 250000000n net of fees
    ],
    'same amount borrowed is returned to LP',
  );
});
