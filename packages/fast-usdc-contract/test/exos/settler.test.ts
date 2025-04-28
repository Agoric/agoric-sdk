import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import {
  decodeAddressHook,
  encodeAddressHook,
} from '@agoric/cosmic-proto/address-hooks.js';
import { PendingTxStatus, TxStatus } from '@agoric/fast-usdc/src/constants.js';
import { AddressHookShape } from '@agoric/fast-usdc/src/type-guards.js';
import type { CctpTxEvidence } from '@agoric/fast-usdc/src/types.js';
import { makeFeeTools } from '@agoric/fast-usdc/src/utils/fees.js';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import cctpChainInfo from '@agoric/orchestration/src/cctp-chain-info.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { mustMatch } from '@agoric/store';
import type {
  AmountKeywordRecord,
  TransferPart,
  ZcfSeatKit,
} from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import type { EReturn } from '@endo/far';
import {
  prepareSettler,
  type SettlerKit,
  stateShape,
} from '../../src/exos/settler.ts';
import { prepareStatusManager } from '../../src/exos/status-manager.ts';
import * as flows from '../../src/fast-usdc.flows.ts';
import { makeSupportsCctp } from '../../src/utils/cctp.ts';
import {
  intermediateRecipient,
  MockCctpTxEvidences,
  MockVTransferEvents,
} from '../fixtures.js';
import { makeTestLogger, prepareMockOrchAccounts } from '../mocks.js';
import { setupFastUsdcTest } from '../supports.js';

const mockZcf = (zone: Zone) => {
  const callLog = [] as any[];

  const makeSeatKit = zone.exoClassKit('MockSeatKit', undefined, () => ({}), {
    zcfSeat: {
      exit() {},
      getCurrentAllocation() {
        return {};
      },
    },
    userSeat: {},
  });

  const zcf = zone.exo('MockZCF', undefined, {
    atomicRearrange(parts) {
      callLog.push({ method: 'atomicRearrange', parts });
    },
    makeEmptySeatKit() {
      const kit = makeSeatKit() as unknown as ZcfSeatKit;
      return kit;
    },
  });
  return { zcf, callLog };
};

const makeTestContext = async t => {
  const common = await setupFastUsdcTest(t);
  const { contractZone: zone } = common.utils;
  const { log, inspectLogs } = makeTestLogger(t.log);
  const statusManager = prepareStatusManager(
    zone.subZone('status-manager'),
    common.commonPrivateArgs.storageNode.makeChildNode('txns'),
    { marshaller: defaultMarshaller, log },
  );
  const { zcf, callLog } = mockZcf(zone.subZone('Mock ZCF'));

  const { vowTools } = common.utils;
  const { usdc } = common.brands;
  const mockAccounts = prepareMockOrchAccounts(zone.subZone('accounts'), {
    vowTools,
    log: t.log,
    usdc,
  });

  const mockWithdrawToSeat = (account, seat, amounts) => {
    callLog.push(
      harden({
        function: 'withdrawToSeat',
        account,
        allocations: seat.getCurrentAllocation(),
        amounts,
      }),
    );
    return vowTools.asVow(() => {});
  };

  const { chainHub } = common.facadeServices;
  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);
  chainHub.registerChain('agoric', fetchedChainInfo.agoric);
  chainHub.registerChain('ethereum', {
    ...cctpChainInfo.ethereum, // to satisfy `CosmosChainInfoShapeV1`
    // @ts-expect-error `chainId` not on `BaseChainInfo`
    chainId: `${cctpChainInfo.ethereum.namespace}:${cctpChainInfo.ethereum.reference}`,
  });

  const forwardFunds = tx =>
    flows.forwardFunds(
      undefined as any,
      {
        log, // some tests check the log calls
        currentChainReference: 'agoric-3',
        supportsCctp: makeSupportsCctp(chainHub),
        statusManager,
        getNobleICA: () => mockAccounts.intermediate.account as any,
        settlementAccount: Promise.resolve(
          mockAccounts.settlement.account as any,
        ),
      },
      tx,
    );

  const makeSettler = prepareSettler(zone.subZone('settler'), {
    statusManager,
    USDC: usdc.brand,
    zcf,
    withdrawToSeat: mockWithdrawToSeat,
    feeConfig: common.commonPrivateArgs.feeConfig,
    vowTools: common.utils.vowTools,
    chainHub,
    log,
    // @ts-expect-error faking the membrane
    forwardFunds,
  });

  const defaultSettlerParams = harden({
    sourceChannel:
      fetchedChainInfo.agoric.connections['noble-1'].transferChannel
        .counterPartyChannelId,
    remoteDenom: 'uusdc',
    intermediateRecipient,
  });

  const makeSimulate = (notifier: SettlerKit['notifier']) => {
    const makeEvidence = (evidence?: CctpTxEvidence): CctpTxEvidence =>
      harden({
        ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
        ...evidence,
      });

    const makeNotifyInfo = (evidence: CctpTxEvidence) => {
      const { txHash } = evidence;
      const { forwardingAddress, amount } = evidence.tx;
      const { recipientAddress } = evidence.aux;
      const decoded = decodeAddressHook(recipientAddress);
      mustMatch(decoded, AddressHookShape);
      const { EUD } = decoded.query;
      return harden({
        txHash,
        forwardingAddress,
        fullAmount: usdc.make(amount),
        destination: chainHub.resolveAccountId(EUD),
      });
    };

    const simulate = harden({
      /**
       * simulate Advancer starting advance
       * @param evidence
       */
      startAdvance: (evidence?: CctpTxEvidence) => {
        const cctpTxEvidence = makeEvidence(evidence);
        t.log('Mock CCTP Evidence:', cctpTxEvidence);
        t.log('Pretend we initiated advance, mark as `ADVANCING`');
        statusManager.advance(cctpTxEvidence);
        return cctpTxEvidence;
      },
      /**
       * Simulate transfer vow settlement (success or failure)
       * @param evidence
       * @param success
       */
      finishAdvance: (evidence: CctpTxEvidence, success = true) => {
        const { Advanced, AdvanceFailed } = TxStatus;
        t.log(`Simulate ${success ? Advanced : AdvanceFailed}`);
        const info = makeNotifyInfo(evidence);
        notifier.notifyAdvancingResult(info, success);
      },
      /**
       * start and finish advance successfully
       * @param evidence
       */
      advance: (evidence?: CctpTxEvidence) => {
        const cctpTxEvidence = simulate.startAdvance(evidence);
        simulate.finishAdvance(cctpTxEvidence, true);
        return cctpTxEvidence;
      },
      skipAdvance: (risksIdentified: string[], evidence?: CctpTxEvidence) => {
        const cctpTxEvidence = makeEvidence(evidence);
        t.log('Mock CCTP Evidence:', cctpTxEvidence);
        t.log('Mark as `ADVANCE_SKIPPED`');
        statusManager.skipAdvance(cctpTxEvidence, risksIdentified ?? []);

        return cctpTxEvidence;
      },
      /**
       * mint early path. caller must simulate tap before calling
       * @param evidence
       */
      observeLate: (evidence?: CctpTxEvidence) => {
        const cctpTxEvidence = makeEvidence(evidence);
        const { destination } = makeNotifyInfo(cctpTxEvidence);
        notifier.checkMintedEarly(cctpTxEvidence, destination);
        return cctpTxEvidence;
      },
    });
    return simulate;
  };

  const repayer = zone.exo('Repayer Mock', undefined, {
    repay(sourceTransfer: TransferPart, amounts: AmountKeywordRecord) {
      callLog.push(harden({ method: 'repay', sourceTransfer, amounts }));
    },
  });

  return {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    makeSimulate,
    repayer,
    peekCalls: () => harden([...callLog]),
    inspectLogs,
    accounts: mockAccounts,
    storage: common.bootstrap.storage,
  };
};

const test = anyTest as TestFn<EReturn<typeof makeTestContext>>;

test.beforeEach(async t => (t.context = await makeTestContext(t)));

test('stateShape', t => {
  t.snapshot(stateShape);
});

test('happy path: disburse to LPs; StatusManager removes tx', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;
  const { feeConfig } = common.commonPrivateArgs;
  const { chainHub } = common.facadeServices;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.advance();
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [{ ...cctpTxEvidence, status: PendingTxStatus.Advanced }],
    'statusManager shows this tx advanced',
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('Funds were disbursed to LP.');
  const calls = peekCalls();
  t.is(calls.length, 2);
  const [withdraw, repay] = calls;

  t.deepEqual(
    withdraw,
    {
      function: 'withdrawToSeat',
      account: accounts.settlement.account,
      allocations: {},
      amounts: { In: usdc.units(150) },
    },
    '1. settler called withdrawToSeat',
  );

  // see also AGORIC_PLUS_OSMO in fees.test.ts
  const In = usdc.units(150);
  const expectedSplit = makeFeeTools(feeConfig).calculateSplit(
    In,
    chainHub.resolveAccountId(cctpTxEvidence.aux.recipientAddress),
  );
  t.deepEqual(expectedSplit, {
    ContractFee: usdc.make(600000n),
    PoolFee: usdc.make(2400001n),
    Principal: usdc.make(146999999n),
    RelayFee: usdc.make(0n),
  });

  t.like(
    repay,
    {
      method: 'repay',
      amounts: expectedSplit,
    },
    '3. settler called repay() on liquidity pool repayer facet',
  );
  t.like(repay.sourceTransfer[2], {
    In: usdc.units(150),
  });

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'SETTLED entry removed from StatusManger',
  );
  await eventLoopIteration();
  const { storage } = t.context;
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { split: expectedSplit, status: 'DISBURSED' },
  ]);

  // Check deletion of DISBURSED transactions
  statusManager.deleteCompletedTxs();
  await eventLoopIteration();
  t.is(storage.data.get(`fun.txns.${cctpTxEvidence.txHash}`), undefined);
});

test('slow path: forward to EUD; remove pending tx', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.skipAdvance(['TOO_LARGE_AMOUNT']);

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('funds are forwarded; no interaction with LP');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(accounts.settlement.callLog, [
    [
      'transfer',
      'cosmos:osmosis-1:osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      usdc.units(150),
      {
        forwardOpts: {
          intermediateRecipient: {
            chainId: 'noble-1',
            encoding: 'bech32',
            value: 'noble1test',
          },
          timeout: '10m',
        },
        timeoutRelativeSeconds: 600n,
      },
    ],
  ]);

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'dequeueStatus entry removed from StatusManger',
  );
  const { storage } = t.context;
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { risksIdentified: ['TOO_LARGE_AMOUNT'], status: 'ADVANCE_SKIPPED' },
    { status: 'FORWARDED' },
  ]);

  // Check deletion of FORWARDED transactions
  statusManager.deleteCompletedTxs();
  await eventLoopIteration();
  t.is(storage.data.get(`fun.txns.${cctpTxEvidence.txHash}`), undefined);
});

test('skip advance: forward to EUD; remove pending tx', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.skipAdvance(['TOO_LARGE_AMOUNT']);
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [{ ...cctpTxEvidence, status: PendingTxStatus.AdvanceSkipped }],
    'statusManager shows this tx is skipped',
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('funds are forwarded; no interaction with LP');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(accounts.settlement.callLog, [
    [
      'transfer',
      'cosmos:osmosis-1:osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      usdc.units(150),
      {
        forwardOpts: {
          intermediateRecipient: {
            chainId: 'noble-1',
            encoding: 'bech32',
            value: 'noble1test',
          },
          timeout: '10m',
        },
        timeoutRelativeSeconds: 600n,
      },
    ],
  ]);
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'FORWARDED entry removed from StatusManger',
  );
  const { storage } = t.context;
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'ADVANCE_SKIPPED', risksIdentified: ['TOO_LARGE_AMOUNT'] },
    { status: 'FORWARDED' },
  ]);

  // Check deletion of FORWARDED transactions
  statusManager.deleteCompletedTxs();
  await eventLoopIteration();
  t.is(storage.data.get(`fun.txns.${cctpTxEvidence.txHash}`), undefined);
});

test('Settlement for unknown transaction (minted early)', async t => {
  const {
    common: {
      brands: { usdc },
    },
    makeSettler,
    defaultSettlerParams,
    repayer,
    accounts,
    peekCalls,
    inspectLogs,
    makeSimulate,
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notifier);

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('Nothing was transferred');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(accounts.settlement.callLog, []);
  const tapLogs = inspectLogs();
  t.like(tapLogs, [
    ['config', { sourceChannel: 'channel-21' }],
    ['upcall event'],
    ['dequeued', undefined],
    ['⚠️ tap: minted before observed'],
  ]);

  t.log('Oracle operators eventually report...');
  const evidence = simulate.observeLate();
  t.deepEqual(inspectLogs().slice(4), [
    [
      'matched minted early key, initiating forward',
      'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd',
      150000000n,
    ],
    [
      'forwarding',
      150000000n,
      'to',
      'cosmos:osmosis-1:osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      'for',
      '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702',
    ],
  ]);
  await eventLoopIteration();
  t.like(accounts.settlement.callLog, [
    [
      'transfer',
      'cosmos:osmosis-1:osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      usdc.units(150),
      {
        forwardOpts: {
          intermediateRecipient: {
            value: 'noble1test',
          },
        },
      },
    ],
  ]);
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    { status: 'FORWARDED' },
  ]);
});

test('Multiple minted early transactions with same address and amount', async t => {
  const {
    makeSettler,
    defaultSettlerParams,
    repayer,
    accounts,
    peekCalls,
    inspectLogs,
    makeSimulate,
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notifier);

  t.log('Simulate first incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('Simulate second incoming IBC settlement with same address and amount');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.log('Nothing transferred yet - both transactions are minted early');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(accounts.settlement.callLog, []);
  const tapLogs = inspectLogs();

  // Should show two instances of "minted before observed"
  const mintedBeforeObservedLogs = tapLogs
    .flat()
    .filter(
      log => typeof log === 'string' && log.includes('minted before observed'),
    );
  t.is(
    mintedBeforeObservedLogs.length,
    2,
    'Should have two "minted before observed" log entries',
  );

  t.log('Oracle operators report first transaction...');
  const evidence1 = simulate.observeLate(
    MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
  );
  await eventLoopIteration();

  t.log('First transfer should complete');
  t.is(
    accounts.settlement.callLog.length,
    1,
    'First transfer should be initiated',
  );
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence1.txHash}`), [
    { evidence: evidence1, status: 'OBSERVED' },
    { status: 'FORWARDED' },
  ]);

  t.log(
    'Oracle operators report second transaction with same address/amount...',
  );
  const evidence2 = simulate.observeLate({
    ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
    txHash:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
  });
  await eventLoopIteration();

  t.log('Second transfer should also complete');
  t.is(
    accounts.settlement.callLog.length,
    2,
    'Second transfer should be initiated',
  );
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence2.txHash}`), [
    { evidence: evidence2, status: 'OBSERVED' },
    { status: 'FORWARDED' },
  ]);

  // Simulate a third transaction and verify no more are tracked as minted early
  simulate.observeLate({
    ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
    txHash:
      '0x0000000000000000000000000000000000000000000000000000000000000001',
  });
  const foundMore = inspectLogs()
    .flat()
    .filter(
      log =>
        typeof log === 'string' && log.includes('matched minted early key'),
    );
  t.is(
    foundMore.length,
    2,
    'Should not find any more minted early transactions',
  );
  t.is(
    accounts.settlement.callLog.length,
    2,
    'No additional transfers should be initiated',
  );
});

test('Settlement for Advancing transaction (advance succeeds)', async t => {
  const {
    accounts,
    defaultSettlerParams,
    inspectLogs,
    makeSettler,
    repayer,
    makeSimulate,
    statusManager,
    common: {
      brands: { usdc },
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
    },
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.startAdvance();
  const { forwardingAddress, amount } = cctpTxEvidence.tx;

  t.deepEqual(
    statusManager.lookupPending(forwardingAddress, amount),
    [{ ...cctpTxEvidence, status: PendingTxStatus.Advancing }],
    'statusManager shows this tx is Advancing',
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.like(inspectLogs(), [
    ['config', { sourceChannel: 'channel-21' }],
    ['upcall event'],
    ['dequeued', { status: PendingTxStatus.Advancing }],
    ['⚠️ tap: minted while advancing'],
  ]);

  const In = usdc.make(MockCctpTxEvidences.AGORIC_PLUS_OSMO().tx.amount);
  const expectedSplit = makeFeeTools(feeConfig).calculateSplit(
    In,
    chainHub.resolveAccountId(cctpTxEvidence.aux.recipientAddress),
  );

  t.log('Simulate advance success');
  simulate.finishAdvance(cctpTxEvidence, true);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { split: expectedSplit, status: 'DISBURSED' },
  ]);
});

test('Settlement for Advancing transaction (advance fails)', async t => {
  const {
    accounts,
    defaultSettlerParams,
    inspectLogs,
    makeSettler,
    repayer,
    makeSimulate,
    common: {
      brands: { usdc },
    },
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });
  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.startAdvance();

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();

  t.like(inspectLogs(), [
    ['config', { sourceChannel: 'channel-21' }],
    ['upcall event'],
    ['dequeued', { status: PendingTxStatus.Advancing }],
    ['⚠️ tap: minted while advancing'],
  ]);

  t.log('Simulate Advance failure (e.g. IBC Timeout)');
  simulate.finishAdvance(cctpTxEvidence, false);
  await eventLoopIteration();

  t.log('Expecting Settler to initiate forward');
  t.like(accounts.settlement.callLog, [
    [
      'transfer',
      'cosmos:osmosis-1:osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      usdc.units(150),
      {
        forwardOpts: {
          intermediateRecipient: {
            value: 'noble1test',
          },
        },
      },
    ],
  ]);

  t.log('Pretend Forward succeeds');
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCE_FAILED' },
    { status: 'FORWARDED' },
  ]);
});

test('slow path, and forward fails (terminal state)', async t => {
  const {
    makeSettler,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    inspectLogs,
    accounts,
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  t.log('simulating forward failure (e.g. unknown route)');
  const mockE = Error('no connection info found');
  accounts.settlement.transferVResolver.reject(mockE);
  await eventLoopIteration();

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_OSMO());
  await eventLoopIteration();
  const simulate = makeSimulate(settler.notifier);

  const evidence = simulate.observeLate();

  const rawLogs = inspectLogs();
  const penultimateLog = rawLogs.slice(rawLogs.length - 2, rawLogs.length - 1);
  await eventLoopIteration();
  t.deepEqual(penultimateLog, [
    [
      'matched minted early key, initiating forward',
      'noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd',
      150000000n,
    ],
  ]);

  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    { status: 'FORWARD_FAILED' },
  ]);
});

test.todo('creator facet methods');

test.todo('ignored packets');

test('bad packet data', async t => {
  const { makeSettler, defaultSettlerParams, repayer, accounts, inspectLogs } =
    t.context;
  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  await settler.tap.receiveUpcall(
    buildVTransferEvent({ sourceChannel: 'channel-21' }),
  );
  t.deepEqual(inspectLogs().at(-1), [
    'invalid event packet',
    ['unexpected denom', { actual: 'uatom', expected: 'uusdc' }],
  ]);

  await settler.tap.receiveUpcall(
    buildVTransferEvent({ sourceChannel: 'channel-21', denom: 'uusdc' }),
  );
  t.deepEqual(inspectLogs().at(-1), [
    'invalid event packet',
    ['no query params', 'agoric1fakeLCAAddress'],
  ]);

  await settler.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: 'channel-21',
      denom: 'uusdc',
      receiver: encodeAddressHook(
        // valid but meaningless address
        'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy',
        {},
      ),
    }),
  );
  t.deepEqual(inspectLogs().at(-1), [
    'invalid event packet',
    [
      'no query params',
      'agoric10rchps2sfet5lleu7xhs6ztgeehkm5lz5rpkz0cqzs95zdge',
    ],
  ]);

  await settler.tap.receiveUpcall(
    buildVTransferEvent({
      sourceChannel: 'channel-21',
      denom: 'uusdc',
      receiver: encodeAddressHook(
        // valid but meaningless address
        'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy',
        { EUD: 'cosmos1foo' },
      ),
      // @ts-expect-error intentionally bad
      amount: 'bad',
    }),
  );
  t.deepEqual(inspectLogs().at(-1), [
    'invalid event packet',
    ['invalid amount', 'bad'],
  ]);

  const goodEvent = buildVTransferEvent({
    sourceChannel: 'channel-21',
    denom: 'uusdc',
    receiver: encodeAddressHook(
      // valid but meaningless address
      'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy',
      { EUD: 'cosmos1foo' },
    ),
  });
  await settler.tap.receiveUpcall(goodEvent);
  t.deepEqual(inspectLogs().at(-1), [
    '⚠️ tap: minted before observed',
    'cosmos1AccAddress',
    10n,
  ]);

  const badJson = {
    ...goodEvent,
    packet: { ...goodEvent.packet, data: 'not json' },
  };
  await settler.tap.receiveUpcall(badJson);
  t.deepEqual(inspectLogs().at(-1), [
    'invalid event packet',
    ['could not parse packet data', 'not json'],
  ]);
});

test('forward to agoric EUD', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.skipAdvance(
    ['TOO_LARGE_AMOUNT'],
    MockCctpTxEvidences.AGORIC_PLUS_AGORIC(),
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_AGORIC());
  await eventLoopIteration();

  t.log('funds are forwarded; no interaction with LP');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(
    accounts.settlement.callLog,
    [
      [
        'send',
        'cosmos:agoric-3:agoric13rj0cc0hm5ac2nt0sdup2l7gvkx4v9tyvgq3h2',
        usdc.make(250000000n),
      ],
    ],
    'bank/send used, not ibc/transfer',
  );

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'dequeueStatus entry removed from StatusManger',
  );
  const { storage } = t.context;
  accounts.settlement.sendVResolver.resolve(undefined);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { risksIdentified: ['TOO_LARGE_AMOUNT'], status: 'ADVANCE_SKIPPED' },
    { status: 'FORWARDED' },
  ]);

  // Check deletion of FORWARDED transactions
  statusManager.deleteCompletedTxs();
  await eventLoopIteration();
  t.is(storage.data.get(`fun.txns.${cctpTxEvidence.txHash}`), undefined);
});

test('forward to Ethereum EUD', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.skipAdvance(
    ['TOO_LARGE_AMOUNT'],
    MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM(),
  );

  t.log('Simulate incoming IBC settlement');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_ETHEREUM());
  await eventLoopIteration();

  t.log('funds are forwarding; no interaction with LP');
  t.deepEqual(peekCalls(), []);
  t.deepEqual(accounts.settlement.callLog, [
    [
      'transfer',
      intermediateRecipient,
      usdc.units(950),
      { timeoutRelativeSeconds: 600n },
    ],
  ]);

  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'dequeueStatus entry removed from StatusManger',
  );
  const { storage } = t.context;

  // simulate MsgTransfer to NobleICA succeeding
  accounts.settlement.transferVResolver.resolve(undefined);
  await eventLoopIteration();

  // simulate MsgDepositForBurn from NobleICA succeeding
  accounts.intermediate.depositForBurnVResolver.resolve(undefined);
  await eventLoopIteration();

  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { risksIdentified: ['TOO_LARGE_AMOUNT'], status: 'ADVANCE_SKIPPED' },
    { status: 'FORWARDED' },
  ]);

  // Check deletion of FORWARDED transactions
  statusManager.deleteCompletedTxs();
  await eventLoopIteration();
  t.is(storage.data.get(`fun.txns.${cctpTxEvidence.txHash}`), undefined);
});

test('forward not attempted: unresolvable destination', async t => {
  const {
    common,
    makeSettler,
    defaultSettlerParams,
    repayer,
    accounts,
    inspectLogs,
    storage,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const txHash =
    '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702';
  const badEud = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'; // missing destination
  settler.self.forward(txHash, usdc.makeEmpty(), badEud);

  // Verify the exact log message for "forward not attempted"
  t.deepEqual(inspectLogs().at(-1), [
    '⚠️ forward not attempted',
    'unresolvable destination',
    txHash,
    badEud,
  ]);

  // Verify the transaction record in storage
  await eventLoopIteration();
  t.deepEqual(
    storage.getDeserialized(`fun.txns.${txHash}`).at(-1),
    { status: 'FORWARD_SKIPPED' }, // unresolvable destination
  );
});

test('forward not attempted: unsupported destination', async t => {
  const {
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
    inspectLogs,
    storage,
  } = t.context;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  // Create a custom CCTP evidence with a Solana address as the EUD
  const solanaEvidence = {
    ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
    aux: {
      ...MockCctpTxEvidences.AGORIC_PLUS_OSMO().aux,
      recipientAddress: encodeAddressHook(
        'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy',
        {
          EUD: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:Gf4DKri6Kw5fHL3VkrX12BaFLWCJXhKShP5epvQWJtpf',
        },
      ),
    },
  };

  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.skipAdvance(
    ['TOO_LARGE_AMOUNT'],
    solanaEvidence,
  );

  // Create a matching VTransferEvent with the Solana EUD
  const solanaTransferEvent = {
    ...MockVTransferEvents.AGORIC_PLUS_OSMO(),
    packet: {
      ...MockVTransferEvents.AGORIC_PLUS_OSMO().packet,
      data: btoa(
        JSON.stringify({
          ...JSON.parse(
            atob(MockVTransferEvents.AGORIC_PLUS_OSMO().packet.data),
          ),
          receiver: encodeAddressHook(
            'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy',
            {
              EUD: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:Gf4DKri6Kw5fHL3VkrX12BaFLWCJXhKShP5epvQWJtpf',
            },
          ),
        }),
      ),
    },
  };

  t.log('Simulate incoming IBC settlement with unsupported Solana destination');
  void settler.tap.receiveUpcall(solanaTransferEvent);
  await eventLoopIteration();

  t.log('No funds should be forwarded for unsupported destination');
  t.deepEqual(peekCalls(), [], 'Should not interact with LP repayer');
  t.deepEqual(accounts.settlement.callLog, [], 'Should not call transfer/send');

  // Verify the exact log message for "forward not attempted"
  t.deepEqual(inspectLogs().at(-1), [
    '⚠️ forward not attempted',
    'unsupported destination',
    '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:Gf4DKri6Kw5fHL3VkrX12BaFLWCJXhKShP5epvQWJtpf',
  ]);

  // Check that the status was properly updated
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'Status entry should be removed from StatusManager',
  );

  // Verify the transaction record in storage
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { risksIdentified: ['TOO_LARGE_AMOUNT'], status: 'ADVANCE_SKIPPED' },
    { status: 'FORWARD_SKIPPED' }, // unsupported destination
  ]);
});

test('forward via cctp failed (MsgTransfer)', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
    inspectLogs,
    storage,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.skipAdvance(
    ['TOO_LARGE_AMOUNT'],
    MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM(),
  );

  // Setup the transfer from settlement to Noble to fail
  const mockTransferError = Error('MsgTransfer failed: insufficient funds');
  accounts.settlement.transferVResolver.reject(mockTransferError);

  t.log('Simulate incoming IBC settlement for Ethereum destination');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_ETHEREUM());
  await eventLoopIteration();

  // Verify the transfer was attempted
  t.deepEqual(peekCalls(), [], 'Should not interact with LP repayer');
  t.deepEqual(
    accounts.settlement.callLog,
    [
      [
        'transfer',
        intermediateRecipient,
        usdc.units(950),
        { timeoutRelativeSeconds: 600n },
      ],
    ],
    'Should attempt transfer to intermediate recipient',
  );

  // Verify error was logged
  t.deepEqual(inspectLogs().at(-1), [
    '🚨 forward intermediate transfer rejected!',
    mockTransferError,
    cctpTxEvidence.txHash,
  ]);

  // Check that the status was properly updated
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'Status entry should be removed from StatusManager',
  );

  // Verify the transaction record in storage
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { risksIdentified: ['TOO_LARGE_AMOUNT'], status: 'ADVANCE_SKIPPED' },
    { status: 'FORWARD_FAILED' }, // Transaction should be marked as FORWARD_FAILED
  ]);
});

test('forward via cctp failed (MsgDepositForBurn)', async t => {
  const {
    common,
    makeSettler,
    statusManager,
    defaultSettlerParams,
    repayer,
    makeSimulate,
    accounts,
    peekCalls,
    inspectLogs,
    storage,
  } = t.context;
  const { usdc } = common.brands;

  const settler = makeSettler({
    repayer,
    settlementAccount: accounts.settlement.account,
    ...defaultSettlerParams,
  });

  const simulate = makeSimulate(settler.notifier);
  const cctpTxEvidence = simulate.skipAdvance(
    ['TOO_LARGE_AMOUNT'],
    MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM(),
  );

  // Set up successful transfer to Noble but failed deposit for burn
  accounts.settlement.transferVResolver.resolve(undefined);
  const mockDepositError = Error(
    'MsgDepositForBurn failed: insufficient funds',
  );
  accounts.intermediate.depositForBurnVResolver.reject(mockDepositError);

  t.log('Simulate incoming IBC settlement for Ethereum destination');
  void settler.tap.receiveUpcall(MockVTransferEvents.AGORIC_PLUS_ETHEREUM());
  await eventLoopIteration();

  // First stage completed (transfer to Noble intermediate account)
  await eventLoopIteration();

  // Verify the transfer was attempted
  t.deepEqual(peekCalls(), [], 'Should not interact with LP repayer');
  t.deepEqual(
    accounts.settlement.callLog,
    [
      [
        'transfer',
        intermediateRecipient,
        usdc.units(950),
        { timeoutRelativeSeconds: 600n },
      ],
    ],
    'Should attempt transfer to intermediate recipient',
  );

  // Verify second stage was attempted and error was logged
  t.deepEqual(
    inspectLogs().at(-1),
    [
      '🚨 forward depositForBurn rejected!',
      mockDepositError,
      cctpTxEvidence.txHash,
    ],
    'Should log depositForBurn rejection with error',
  );

  // Check that the status was properly updated
  t.deepEqual(
    statusManager.lookupPending(
      cctpTxEvidence.tx.forwardingAddress,
      cctpTxEvidence.tx.amount,
    ),
    [],
    'Status entry should be removed from StatusManager',
  );

  // Verify the transaction record in storage
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`fun.txns.${cctpTxEvidence.txHash}`), [
    { evidence: cctpTxEvidence, status: 'OBSERVED' },
    { risksIdentified: ['TOO_LARGE_AMOUNT'], status: 'ADVANCE_SKIPPED' },
    { status: 'FORWARD_FAILED' }, // Transaction should be marked as FORWARD_FAILED
  ]);
});
